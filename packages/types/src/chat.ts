// ─── Shared chat types ────────────────────────────────────────────────────────
// Used on both the Express server and the Next.js frontend.

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isAI: boolean;
  createdAt: string; // ISO string (serialised from Date)
}

export interface ConversationDTO {
  id: string;
  otherUser: UserPublic;
  lastMessage?: MessageDTO;
  updatedAt: string;
}

// ─── Socket payload types ─────────────────────────────────────────────────────

/** Client → Server: send a new message */
export interface SendMessagePayload {
  conversationId: string;
  receiverId: string;
  content: string;
}

/** Server → Client: a message was received */
export type MessageReceivedPayload = MessageDTO;

// ─── AI Socket payload types ──────────────────────────────────────────────────

/** Server → Client: AI is typing (show typing indicator) */
export interface AITypingPayload {
  conversationId: string;
  receiverId: string; // The AI "sender" (the receiver of the original message)
}

/** Server → Client: AI reply stored and ready (same shape as message-received) */
export type AIReplyPayload = MessageDTO;

/** Server → Client: AI draft generated (MANUAL mode, not persisted) */
export interface AIDraftPayload {
  conversationId: string;
  draft: string;
}

/** Client → Server: user explicitly requests an AI draft (MANUAL mode) */
export interface GenerateAIReplyPayload {
  conversationId: string;
  receiverId: string;
  /** The original message content to reply to */
  content: string;
}

