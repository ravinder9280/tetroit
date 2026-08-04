import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import type { MessageReceivedPayload, SendMessagePayload } from "@monorepo/types";

let io: SocketServer;

const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

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

      // Persist to DB
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId,
          receiverId,
          content,
          isAI: false,
        },
      });

      // Update conversation's updatedAt so it bubbles to the top of the list
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

      // Emit to both sender's and receiver's personal rooms
      io.to(senderId).to(receiverId).emit("message-received", payload);
    });

    // ── generate-ai-reply (stub for later) ───────────────────────────────────
    socket.on("generate-ai-reply", async (payload) => {
      // TODO: implement in AI phase
      console.log("[socket] generate-ai-reply stub", payload);
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
