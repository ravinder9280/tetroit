// ─── AI Settings Routes ───────────────────────────────────────────────────────

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  AISettingsService,
} from "../modules/ai-settings/ai-settings.service.js";
import { ValidationError } from "../modules/users/user.service.js";

const aiSettingsRouter = Router();
const aiSettingsService = new AISettingsService();

/**
 * GET /v1/ai-settings
 * Returns the current user's AI settings.
 * Auto-creates default settings on first call.
 */
aiSettingsRouter.get("/", requireAuth, async (_req, res) => {
  const me = res.locals.user as { id: string };
  try {
    const settings = await aiSettingsService.getSettings(me.id);
    res.json(aiSettingsService.toDTO(settings));
  } catch (err) {
    console.error("[ai-settings] getSettings error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /v1/ai-settings
 * Upsert the current user's AI settings.
 * Body: { mode?, triggerType?, inactivityMinutes?, customInstructions? }
 */
aiSettingsRouter.put("/", requireAuth, async (req, res) => {
  const me = res.locals.user as { id: string };
  try {
    const updated = await aiSettingsService.updateSettings(me.id, req.body);
    res.json(aiSettingsService.toDTO(updated));
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("[ai-settings] updateSettings error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default aiSettingsRouter;
