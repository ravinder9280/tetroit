export interface LLMProvider {
  generateReply(systemPrompt: string, userPrompt: string): Promise<string>;
  readonly providerName: string;
}
