// ─── AI Settings Repository ───────────────────────────────────────────────────
// Data-access layer for AiSettings CRUD.

import { prisma } from "../../lib/db.js";
import type { AiMode, TriggerType } from "@monorepo/types";

export interface UpsertAISettingsData {
  mode?: AiMode;
  triggerType?: TriggerType;
  inactivityMinutes?: number;
  customInstructions?: string | null;
}

export class AISettingsRepository {
  /** Get settings for a user, or null if they don't exist yet */
  async findByUserId(userId: string) {
    return prisma.aiSettings.findUnique({
      where: { userId },
    });
  }

  /** Upsert (create or update) AI settings for a user */
  async upsert(userId: string, data: UpsertAISettingsData) {
    return prisma.aiSettings.upsert({
      where: { userId },
      create: {
        userId,
        mode: data.mode ?? "DISABLED",
        triggerType: data.triggerType ?? "ALWAYS",
        inactivityMinutes: data.inactivityMinutes ?? 5,
        customInstructions: data.customInstructions ?? null,
      },
      update: {
        ...(data.mode !== undefined && { mode: data.mode }),
        ...(data.triggerType !== undefined && { triggerType: data.triggerType }),
        ...(data.inactivityMinutes !== undefined && {
          inactivityMinutes: data.inactivityMinutes,
        }),
        ...(data.customInstructions !== undefined && {
          customInstructions: data.customInstructions,
        }),
      },
    });
  }
}
