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
