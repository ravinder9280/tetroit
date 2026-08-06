// ─── User Profile Zod Schema ──────────────────────────────────────────────────

import { z } from "zod";

export const updateUserProfileSchema = z.object({
  bio: z.string().max(500).nullable().optional(),
  profession: z.string().max(100).nullable().optional(),
  interests: z.string().max(300).nullable().optional(),
  personality: z.string().max(200).nullable().optional(),
  communicationStyle: z.string().max(200).nullable().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
