// ─── AI Context Type ──────────────────────────────────────────────────────────
// The single data structure that flows through the AI pipeline.
// ContextBuilder builds it; PromptBuilder consumes it.
//
// We use local type definitions (not importing from generated Prisma files
// which use @ts-nocheck and unstable internal namespaces) to keep this
// type-safe and future-proof.

// ─── Lightweight DB shape types ───────────────────────────────────────────────

export interface DBMessage {
  senderId: string;
  content: string;
  createdAt: Date;
  isAI: boolean;
}

export interface DBAiSettings {
  id: string;
  userId: string;
  mode: string;          // "DISABLED" | "MANUAL" | "AUTOMATIC"
  triggerType: string;   // "ALWAYS" | "WHEN_OFFLINE" | "AFTER_INACTIVITY"
  inactivityMinutes: number;
  customInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── AI User Profile ──────────────────────────────────────────────────────────

/** Subset of User fields relevant to the AI (no passwords / sessions) */
export interface AIUserProfile {
  id: string;
  name: string;
  bio: string | null;
  profession: string | null;
  interests: string | null;
  personality: string | null;
  communicationStyle: string | null;
}

// ─── AI Context ───────────────────────────────────────────────────────────────

/** The assembled context passed into the prompt builder */
export interface AIContext {
  /** The user whose AI agent will respond */
  receiver: AIUserProfile;
  /** That user's AI settings */
  aiSettings: DBAiSettings;
  /** Last N messages from the conversation (chronological order) */
  conversationHistory: DBMessage[];
  /** The new incoming message that triggered the AI pipeline */
  incomingMessage: {
    senderId: string;
    content: string;
  };
}
