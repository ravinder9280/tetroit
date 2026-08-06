import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { UserService, ValidationError } from "../modules/users/user.service.js";

const usersRouter = Router();
const userService = new UserService();

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

/**
 * GET /v1/users/me/profile
 * Returns the current user's full AI profile.
 */
usersRouter.get("/me/profile", requireAuth, async (_req, res) => {
  const me = res.locals.user as { id: string };
  try {
    const profile = await userService.getProfile(me.id);
    res.json(profile);
  } catch (err) {
    console.error("[users] getProfile error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /v1/users/me/profile
 * Update the current user's AI profile fields.
 * Body: { bio?, profession?, interests?, personality?, communicationStyle? }
 */
usersRouter.put("/me/profile", requireAuth, async (req, res) => {
  const me = res.locals.user as { id: string };
  try {
    const updated = await userService.updateProfile(me.id, req.body);
    res.json(updated);
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[users] updateProfile error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default usersRouter;

