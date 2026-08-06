// ─── AI Settings Service ──────────────────────────────────────────────────────
// Business logic layer for AiSettings operations.
// Auto-creates defaults when no settings exist yet.

import { AISettingsRepository } from "./ai-settings.repository.js";
import { updateAISettingsSchema } from "./ai-settings.schema.js";
import { ValidationError } from "../users/user.service.js";

const DEFAULT_SETTINGS = {
  mode: "DISABLED" as const,
  triggerType: "ALWAYS" as const,
  inactivityMinutes: 5,
  customInstructions: null,
};

export class AISettingsService {
  private readonly repo: AISettingsRepository;

  constructor() {
    this.repo = new AISettingsRepository();
  }

  /** Get AI settings for a user. Creates defaults if no record exists. */
  async getSettings(userId: string) {
    const settings = await this.repo.findByUserId(userId);
    if (!settings) {
      // Auto-provision default settings on first access
      return this.repo.upsert(userId, DEFAULT_SETTINGS);
    }
    return settings;
  }

  /** Validate and update AI settings for a user. */
  async updateSettings(userId: string, body: unknown) {
    const parsed = updateAISettingsSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e: { message: string }) => e.message).join(", ");
      throw new ValidationError(messages);
    }
    return this.repo.upsert(userId, parsed.data);
  }

  /** Serialize a settings record to a DTO (ISO dates as strings). */
  toDTO(settings: Awaited<ReturnType<AISettingsRepository["upsert"]>>) {
    return {
      id: settings.id,
      userId: settings.userId,
      mode: settings.mode,
      triggerType: settings.triggerType,
      inactivityMinutes: settings.inactivityMinutes,
      customInstructions: settings.customInstructions,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
