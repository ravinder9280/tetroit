// ─── Prompt Builder ───────────────────────────────────────────────────────────
// Single responsibility: transform an AIContext into system + user prompts.
// Pure function — no DB calls, no side effects.

import type { AIContext } from "../types/ai-context.type.js";

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export class PromptBuilder {
  /**
   * Build a system prompt + user prompt from the assembled AIContext.
   * The prompts are designed so any instruction-following LLM can use them.
   */
  build(ctx: AIContext): BuiltPrompt {
    const { receiver, aiSettings, conversationHistory, incomingMessage } = ctx;

    // ── System Prompt ─────────────────────────────────────────────────────────
    const systemParts: string[] = [
      `You are an AI assistant speaking on behalf of ${receiver.name}.`,
    ];

    if (receiver.personality) {
      systemParts.push(`Personality: ${receiver.personality}`);
    }
    if (receiver.profession) {
      systemParts.push(`Profession: ${receiver.profession}`);
    }
    if (receiver.interests) {
      systemParts.push(`Interests: ${receiver.interests}`);
    }
    if (receiver.communicationStyle) {
      systemParts.push(`Communication style: ${receiver.communicationStyle}`);
    }
    if (receiver.bio) {
      systemParts.push(`Bio: ${receiver.bio}`);
    }

    // AI config context
    systemParts.push(
      `AI Mode: ${aiSettings.mode}`,
      `Trigger: ${aiSettings.triggerType}`
    );

    if (aiSettings.customInstructions) {
      systemParts.push(
        `Additional instructions: ${aiSettings.customInstructions}`
      );
    }

    systemParts.push(
      "Reply naturally and concisely on behalf of the user. Do not start your reply with 'As an AI' or similar disclaimers."
    );

    const systemPrompt = systemParts.join("\n");

    // ── User Prompt ───────────────────────────────────────────────────────────
    const userParts: string[] = [];

    if (conversationHistory.length > 0) {
      userParts.push("--- Conversation history (oldest first) ---");
      for (const msg of conversationHistory) {
        const speaker =
          msg.senderId === receiver.id
            ? `${receiver.name} (you)`
            : "Other person";
        const aiTag = msg.isAI ? " [AI]" : "";
        userParts.push(`${speaker}${aiTag}: ${msg.content}`);
      }
      userParts.push("--- End of history ---");
    }

    userParts.push(
      "",
      `New incoming message: "${incomingMessage.content}"`,
      "",
      "Please write a reply."
    );

    const userPrompt = userParts.join("\n");

    return { systemPrompt, userPrompt };
  }
}
