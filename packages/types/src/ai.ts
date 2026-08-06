// ─── AI / Profile shared types ────────────────────────────────────────────────
// Used on both the Express server and the Next.js frontend.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AiMode = "DISABLED" | "MANUAL" | "AUTOMATIC";

export type TriggerType = "ALWAYS" | "WHEN_OFFLINE" | "AFTER_INACTIVITY";

// ─── User Profile ─────────────────────────────────────────────────────────────

/** The AI-relevant portion of a user's profile */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  bio?: string | null;
  profession?: string | null;
  interests?: string | null;
  personality?: string | null;
  communicationStyle?: string | null;
}

// ─── AI Settings ──────────────────────────────────────────────────────────────

export interface AISettingsDTO {
  id: string;
  userId: string;
  mode: AiMode;
  triggerType: TriggerType;
  inactivityMinutes: number;
  customInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAISettingsBody {
  mode?: AiMode;
  triggerType?: TriggerType;
  inactivityMinutes?: number;
  customInstructions?: string | null;
}

export interface UpdateUserProfileBody {
  bio?: string | null;
  profession?: string | null;
  interests?: string | null;
  personality?: string | null;
  communicationStyle?: string | null;
}
