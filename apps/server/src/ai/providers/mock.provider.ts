import type { LLMProvider } from "../interfaces/llm-provider.interface.js";

export class MockProvider implements LLMProvider {
  readonly providerName = "MockProvider";

  async generateReply(
    _systemPrompt: string,
    _userPrompt: string
  ): Promise<string> {
    await Promise.resolve();
    return "This is a mock AI response.";
  }
}
