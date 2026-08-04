import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { MessageDTO } from "@monorepo/types";

const messagesRouter = Router();

/**
 * GET /v1/conversations/:conversationId/messages
 * Returns up to 50 messages in ascending order (oldest first)
 * so the chat window can render them top-to-bottom.
 */
messagesRouter.get(
  "/:conversationId/messages",
  requireAuth,
  async (req, res) => {
    const me = res.locals.user as { id: string };
    const conversationId = req.params["conversationId"] as string;

    // Verify the caller is a participant in this conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participant1Id: me.id }, { participant2Id: me.id }],
      },
    });

    if (!conversation) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversationId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const result: MessageDTO[] = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      receiverId: m.receiverId,
      content: m.content,
      isAI: m.isAI,
      createdAt: m.createdAt.toISOString(),
    }));

    res.json(result);
  }
);

export default messagesRouter;
