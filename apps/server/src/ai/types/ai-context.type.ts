export interface DBMessage {
  senderId: string;
  content: string;
  createdAt: Date;
  isAI: boolean;
}

export interface DBAiSettings {
  id: string;
  userId: string;
  mode: string;
  triggerType: string;
  inactivityMinutes: number;
  customInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIUserProfile {
  id: string;
  name: string;
  bio: string | null;
  profession: string | null;
  interests: string | null;
  personality: string | null;
  communicationStyle: string | null;
}

export interface AIContext {
  receiver: AIUserProfile;
  aiSettings: DBAiSettings;
  conversationHistory: DBMessage[];
  incomingMessage: {
    senderId: string;
    content: string;
  };
}
