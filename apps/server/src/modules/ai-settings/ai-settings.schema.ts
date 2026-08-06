// ─── AI Settings Zod Schema ───────────────────────────────────────────────────

import { z } from "zod";

const aiModeEnum = z.enum(["DISABLED", "MANUAL", "AUTOMATIC"]);
const triggerTypeEnum = z.enum(["ALWAYS", "WHEN_OFFLINE", "AFTER_INACTIVITY"]);

export const updateAISettingsSchema = z.object({
  mode: aiModeEnum.optional(),
  triggerType: triggerTypeEnum.optional(),
  inactivityMinutes: z.number().int().min(1).max(1440).optional(),
  customInstructions: z.string().max(1000).nullable().optional(),
});

export type UpdateAISettingsInput = z.infer<typeof updateAISettingsSchema>;
