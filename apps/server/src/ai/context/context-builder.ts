// ─── Context Builder ──────────────────────────────────────────────────────────
// Single responsibility: assemble an AIContext from the database.
// The orchestrator calls this; it knows nothing about prompts or providers.

import { prisma } from "../../lib/db.js";
import type { AIContext, AIUserProfile } from "../types/ai-context.type.js";
import { aiLogger } from "../utils/logger.js";

const HISTORY_LIMIT = 20;

export class ContextBuilder {
  /**
   * Build the full AIContext for a given message event.
   *
   * @param receiverId      - The user whose AI agent should respond
   * @param conversationId  - The conversation where the message was sent
   * @param incomingMessage - The new message that arrived
   */
  async build(
    receiverId: string,
    conversationId: string,
    incomingMessage: { senderId: string; content: string }
  ): Promise<AIContext> {
    // 1. Load receiver profile
    aiLogger.step("LOADING_PROFILE", { receiverId });
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: {
        id: true,
        name: true,
        bio: true,
        profession: true,
        interests: true,
        personality: true,
        communicationStyle: true,
        aiSettings: true,
      },
    });

    if (!receiver) {
      throw new Error(`ContextBuilder: receiver ${receiverId} not found`);
    }

    if (!receiver.aiSettings) {
      throw new Error(
        `ContextBuilder: no AiSettings found for receiver ${receiverId}`
      );
    }

    const profile: AIUserProfile = {
      id: receiver.id,
      name: receiver.name,
      bio: receiver.bio,
      profession: receiver.profession,
      interests: receiver.interests,
      personality: receiver.personality,
      communicationStyle: receiver.communicationStyle,
    };

    // 2. Load conversation history
    aiLogger.step("LOADING_CONTEXT", { conversationId, limit: HISTORY_LIMIT });
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: {
        senderId: true,
        content: true,
        createdAt: true,
        isAI: true,
      },
    });

    // Reverse so messages are in chronological order (oldest first)
    history.reverse();

    return {
      receiver: profile,
      aiSettings: receiver.aiSettings,
      conversationHistory: history,
      incomingMessage,
    };
  }
}
