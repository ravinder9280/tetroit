// ─── Mock LLM Provider ────────────────────────────────────────────────────────
// Implements LLMProvider without calling any external API.
// Replace this class (or register a different provider) when integrating
// OpenAI, Gemini, or Claude in Phase 3.

import type { LLMProvider } from "../interfaces/llm-provider.interface.js";

export class MockProvider implements LLMProvider {
  readonly providerName = "MockProvider";

  async generateReply(
    _systemPrompt: string,
    _userPrompt: string
  ): Promise<string> {
    // Simulate a tiny async delay (as a real provider would have)
    await Promise.resolve();
    return "This is a mock AI response.";
  }
}
