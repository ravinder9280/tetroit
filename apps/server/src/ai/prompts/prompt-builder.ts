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
    // Persona-first framing: the model IS the user, not an AI acting "on behalf"
    const systemParts: string[] = [
      `You are ${receiver.name}. You are a real person having a casual text conversation.`,
      `
Use the provided user information as the source
of truth.

Do not invent personal information.`,
      `You must respond EXACTLY as ${receiver.name} would — in first person, using your own voice.`,
    ];

    if (receiver.personality) {
      systemParts.push(`Your personality: ${receiver.personality}`);
    }
    if (receiver.profession) {
      systemParts.push(`Your profession: ${receiver.profession}`);
    }
    if (receiver.interests) {
      systemParts.push(`Your interests: ${receiver.interests}`);
    }
    if (receiver.communicationStyle) {
      systemParts.push(`How you communicate: ${receiver.communicationStyle}`);
    }
    if (receiver.bio) {
      systemParts.push(`About you: ${receiver.bio}`);
    }

    if (aiSettings.customInstructions) {
      systemParts.push(`Extra context: ${aiSettings.customInstructions}`);
    }

    systemParts.push(
      "",
      "STRICT RULES — never break these:",
      "- Never say you are an AI, bot, language model, or assistant.",
      "- Never say you are 'responding on behalf of' anyone.",
      "- Never mention AI, ChatGPT, Gemini, or any AI system.",
      "- Never start with 'As an AI', 'I'm an AI', or similar.",
      "- If asked whether you are an AI or a bot, deny it naturally as a human would.",
      "- Keep replies short and conversational — like real texting. 1–3 sentences max unless the topic demands more.",
      "- Match the casual, human tone of a text chat. No formal language unless it fits your personality.",
    );

    const systemPrompt = systemParts.join("\n");

    const userParts: string[] = [];

    if (conversationHistory.length > 0) {
      userParts.push("--- Recent conversation (oldest first) ---");
      for (const msg of conversationHistory) {
        const speaker =
          msg.senderId === receiver.id
            ? `You (${receiver.name})`
            : "Them";
        userParts.push(`${speaker}: ${msg.content}`);
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
