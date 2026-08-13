import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import type {
  AIDraftPayload,
  AIReplyPayload,
  AITypingPayload,
  GenerateAIReplyPayload,
  MessageReceivedPayload,
  SendMessagePayload,
} from "@monorepo/types";
import { aiLogger } from "../ai/utils/logger.js";
import { AISettingsService } from "../modules/ai-settings/ai-settings.service.js";
import { AIOrchestrator } from "../ai/orchestrator/ai-orchestrator.js";
import { getGeminiProvider } from "../ai/providers/gemini.provider.js";
import { AI_FALLBACK_REPLY, AIProviderError } from "../ai/errors/ai-errors.js";

let io: SocketServer;

// ─── Singletons ───────────────────────────────────────────────────────────────

const aiSettingsService = new AISettingsService();

/**
 * Lazily create the orchestrator with GeminiProvider.
 * We lazy-init so that a missing GEMINI_API_KEY only throws when the first
 * AI message actually fires — not on server startup (safer DX during testing).
 */
let _orchestrator: AIOrchestrator | null = null;

function getOrchestrator(): AIOrchestrator {
  if (!_orchestrator) {
    _orchestrator = new AIOrchestrator(getGeminiProvider());
  }
  return _orchestrator;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Artificial delay before sending the AI reply (simulates natural typing) */
const TYPING_DELAY_MS = Number(process.env["AI_TYPING_DELAY_MS"] ?? 1000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

const generateAIReplySchema = z.object({
  conversationId: z.string().min(1),
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

// ─── AI Pipeline Helpers ──────────────────────────────────────────────────────

/**
 * Handle AUTOMATIC mode: generate and emit an AI reply.
 * Errors are caught here — chat delivery is NEVER blocked by AI failures.
 */
async function handleAutomaticAI(params: {
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
}): Promise<void> {
  const { senderId, receiverId, conversationId, content } = params;

  try {
    aiLogger.info("[AI] Automatic mode — starting pipeline", {
      receiverId,
      conversationId,
    });

    // 1. Emit typing indicator to the sender
    const typingPayload: AITypingPayload = { conversationId, receiverId };
    io.to(senderId).to(receiverId).emit("ai-typing", typingPayload);
    aiLogger.info("[AI] Socket emitted: ai-typing", { senderId });

    // 2. Artificial delay to simulate natural typing
    await sleep(TYPING_DELAY_MS);

    // 3. Run the full AI pipeline
    const result = await getOrchestrator().run({
      receiverId,
      conversationId,
      incomingMessage: { senderId, content },
    });

    if (!result.replied || !result.reply) {
      aiLogger.info("[AI] Orchestrator decided not to reply", {
        reason: result.reason,
      });
      return;
    }

    const replyText = result.reply;
    aiLogger.info("[AI] Gemini response received", {
      replyLength: replyText.length,
    });

    // 4. Save AI message to DB (senderId = receiverId because AI speaks as them)
    aiLogger.info("[AI] Saving AI message to DB");
    const aiMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: receiverId,   // AI speaks on behalf of the receiver
        receiverId: senderId,   // directed back to the human sender
        content: replyText,
        isAI: true,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // 5. Emit message-received (treated like a normal message)
    const messagePayload: MessageReceivedPayload = {
      id: aiMessage.id,
      conversationId: aiMessage.conversationId,
      senderId: aiMessage.senderId,
      receiverId: aiMessage.receiverId,
      content: aiMessage.content,
      isAI: aiMessage.isAI,
      createdAt: aiMessage.createdAt.toISOString(),
    };

    io.to(senderId).to(receiverId).emit("message-received", messagePayload);

    // 6. Also emit ai-reply (lets the frontend apply specific AI reply logic)
    const aiReplyPayload: AIReplyPayload = messagePayload;
    io.to(senderId).emit("ai-reply", aiReplyPayload);

    aiLogger.info("[AI] Socket emitted: message-received + ai-reply", {
      messageId: aiMessage.id,
    });
  } catch (err) {
    aiLogger.error("[AI] Pipeline error in AUTOMATIC mode", err);

    // Emit a safe fallback as an AI message so the conversation doesn't just hang
    try {
      const fallbackMessage = await prisma.message.create({
        data: {
          conversationId,
          senderId: receiverId,
          receiverId: senderId,
          content: AI_FALLBACK_REPLY,
          isAI: true,
        },
      });

      const fallbackPayload: MessageReceivedPayload = {
        id: fallbackMessage.id,
        conversationId: fallbackMessage.conversationId,
        senderId: fallbackMessage.senderId,
        receiverId: fallbackMessage.receiverId,
        content: fallbackMessage.content,
        isAI: fallbackMessage.isAI,
        createdAt: fallbackMessage.createdAt.toISOString(),
      };
      io.to(senderId).emit("message-received", fallbackPayload);
    } catch (dbErr) {
      aiLogger.error("[AI] Could not save fallback message", dbErr);
    }
  }
}

/**
 * Handle MANUAL mode draft generation.
 * Result is emitted only to the requester — nothing is persisted.
 */
async function handleManualDraft(params: {
  requesterId: string;
  receiverId: string;
  conversationId: string;
  content: string;
}): Promise<void> {
  const { requesterId, receiverId, conversationId, content } = params;

  try {
    aiLogger.info("[AI] Manual mode — generating draft", {
      receiverId,
      conversationId,
    });

    const draft = await getOrchestrator().generateDraft({
      receiverId,
      conversationId,
      incomingMessage: { senderId: requesterId, content },
    });

    const draftPayload: AIDraftPayload = { conversationId, draft };
    io.to(requesterId).emit("ai-draft", draftPayload);

    aiLogger.info("[AI] Socket emitted: ai-draft", {
      requesterId,
      draftLength: draft.length,
    });
  } catch (err) {
    const isProviderError = err instanceof AIProviderError;
    aiLogger.error(
      `[AI] Draft generation failed${isProviderError ? ` (${err.providerName})` : ""}`,
      err
    );

    // Emit a fallback draft so the UI isn't left waiting
    const draftPayload: AIDraftPayload = {
      conversationId,
      draft: AI_FALLBACK_REPLY,
    };
    io.to(requesterId).emit("ai-draft", draftPayload);
  }
}

// ─── Socket Initialization ────────────────────────────────────────────────────

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    // Each user joins a personal room so we can target them directly
    socket.on("join", (userId: string) => {
      socket.join(userId);
      console.log(`[socket] ${socket.id} joined room: ${userId}`);
    });

    // ── send-message ─────────────────────────────────────────────────────────
    socket.on("send-message", async (raw: SendMessagePayload) => {
      const parsed = sendMessageSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit("error", { message: "Invalid message payload" });
        return;
      }

      const { conversationId, receiverId, content } = parsed.data;

      // Resolve senderId from the socket's rooms (the "join" event set it)
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      const senderId = rooms[0];

      if (!senderId) {
        socket.emit("error", { message: "Not authenticated on socket" });
        return;
      }

      // Verify sender is a participant in this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { participant1Id: senderId },
            { participant2Id: senderId },
          ],
        },
      });

      if (!conversation) {
        socket.emit("error", { message: "Forbidden" });
        return;
      }

      // Persist the human message to DB
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content,
          isAI: false,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const payload: MessageReceivedPayload = {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        isAI: message.isAI,
        createdAt: message.createdAt.toISOString(),
      };

      // Deliver the human message to both parties immediately
      io.to(senderId).to(receiverId).emit("message-received", payload);

      // ── AI Pipeline ─────────────────────────────────────────────────────────
      // Check receiver's AI settings and run the appropriate flow.
      // Errors are contained — chat delivery is never blocked.
      void (async () => {
        try {
          aiLogger.step("INCOMING_MESSAGE", {
            conversationId,
            senderId,
            receiverId,
          });

          const aiSettings = await aiSettingsService.getSettings(receiverId);

          if (aiSettings.mode === "DISABLED") {
            aiLogger.info("[AI] Disabled — no action taken", { receiverId });
          } else if (aiSettings.mode === "MANUAL") {
            aiLogger.info(
              "[AI] Manual mode — awaiting explicit generate-ai-reply event",
              { receiverId }
            );
          } else if (aiSettings.mode === "AUTOMATIC") {
            // Only ALWAYS trigger is implemented; others are placeholders
            if (aiSettings.triggerType === "ALWAYS") {
              await handleAutomaticAI({
                senderId,
                receiverId,
                conversationId,
                content,
              });
            } else {
              aiLogger.info(
                `[AI] Trigger ${aiSettings.triggerType} is not yet implemented`,
                { receiverId }
              );
            }
          }
        } catch (err) {
          aiLogger.error("[AI] Failed to process AI settings", err);
        }
      })();
    });

    // ── generate-ai-reply — MANUAL mode trigger ───────────────────────────────
    socket.on("generate-ai-reply", async (raw: GenerateAIReplyPayload) => {
      const parsed = generateAIReplySchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit("error", { message: "Invalid generate-ai-reply payload" });
        return;
      }

      const { conversationId, receiverId, content } = parsed.data;

      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      const requesterId = rooms[0];

      if (!requesterId) {
        socket.emit("error", { message: "Not authenticated on socket" });
        return;
      }

      await handleManualDraft({
        requesterId,
        receiverId,
        conversationId,
        content,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/** Call this anywhere on the server to emit events to specific users */
export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.io has not been initialised yet");
  return io;
}
