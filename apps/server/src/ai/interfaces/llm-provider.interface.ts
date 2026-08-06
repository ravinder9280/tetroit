// ─── LLM Provider Interface ───────────────────────────────────────────────────
// All AI providers (OpenAI, Gemini, Claude, Mock) must implement this contract.
// The orchestrator depends ONLY on this interface — never on a concrete class.

export interface LLMProvider {
  /**
   * Generate a reply given a full prompt string.
   * @param systemPrompt - Role/personality context for the AI
   * @param userPrompt   - The actual conversation + incoming message
   * @returns The AI-generated reply text
   */
  generateReply(systemPrompt: string, userPrompt: string): Promise<string>;

  /** Human-readable name of this provider (used in logs) */
  readonly providerName: string;
}
