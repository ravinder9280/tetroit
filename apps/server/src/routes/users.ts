import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";

const usersRouter = Router();

/**
 * GET /v1/users
 * Returns all users except the currently logged-in user.
 * Used to populate the "start a new chat" user list.
 */
usersRouter.get("/", requireAuth, async (_req, res) => {
  const me = res.locals.user as { id: string };

  const users = await prisma.user.findMany({
    where: { id: { not: me.id } },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });

  res.json(users);
});

export default usersRouter;
