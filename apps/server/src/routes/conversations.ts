import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { ConversationDTO } from "@monorepo/types";

const conversationsRouter = Router();

/**
 * GET /v1/conversations
 * List all conversations the caller participates in,
 * each with the other user and the most recent message.
 */
conversationsRouter.get("/", requireAuth, async (_req, res) => {
  const me = res.locals.user as { id: string };

  const rows = await prisma.conversation.findMany({
    where: {
      OR: [{ participant1Id: me.id }, { participant2Id: me.id }],
    },
    include: {
      participant1: { select: { id: true, name: true, email: true, image: true } },
      participant2: { select: { id: true, name: true, email: true, image: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result: ConversationDTO[] = rows.map((c) => {
    const otherUser =
      c.participant1Id === me.id ? c.participant2 : c.participant1;
    const last = c.messages[0];

    return {
      id: c.id,
      otherUser,
      lastMessage: last
        ? {
            id: last.id,
            conversationId: last.conversationId,
            senderId: last.senderId,
            receiverId: last.receiverId,
            content: last.content,
            isAI: last.isAI,
            createdAt: last.createdAt.toISOString(),
          }
        : undefined,
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  res.json(result);
});

/**
 * POST /v1/conversations
 * Create a new conversation or return the existing one.
 * Body: { participantId: string }
 */
conversationsRouter.post("/", requireAuth, async (req, res) => {
  const me = res.locals.user as { id: string };

  const schema = z.object({ participantId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "participantId is required" });
    return;
  }

  const { participantId } = parsed.data;

  // Ensure canonical order (smaller id is always participant1)
  const [p1, p2] =
    me.id < participantId ? [me.id, participantId] : [participantId, me.id];

  const conversation = await prisma.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id: p1, participant2Id: p2 } },
    create: { participant1Id: p1, participant2Id: p2 },
    update: {},
    include: {
      participant1: { select: { id: true, name: true, email: true, image: true } },
      participant2: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  const otherUser =
    conversation.participant1Id === me.id
      ? conversation.participant2
      : conversation.participant1;

  const dto: ConversationDTO = {
    id: conversation.id,
    otherUser,
    updatedAt: conversation.updatedAt.toISOString(),
  };

  res.status(201).json(dto);
});

export default conversationsRouter;
