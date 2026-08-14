import type { DBAiSettings } from "../types/ai-context.type.js";
import type { LLMProvider } from "../interfaces/llm-provider.interface.js";
import { ContextBuilder } from "../context/context-builder.js";
import { PromptBuilder } from "../prompts/prompt-builder.js";
import { aiLogger } from "../utils/logger.js";

export interface OrchestratorInput {
  receiverId: string;
  conversationId: string;
  incomingMessage: { senderId: string; content: string };
}

export interface OrchestratorResult {
  replied: boolean;
  reply?: string;
  reason?: string;
}

export class AIOrchestrator {
  private readonly contextBuilder: ContextBuilder;
  private readonly promptBuilder: PromptBuilder;

  constructor(private readonly provider: LLMProvider) {
    this.contextBuilder = new ContextBuilder();
    this.promptBuilder = new PromptBuilder();
  }

  shouldRespond(aiSettings: DBAiSettings): { should: boolean; reason: string } {
    if (aiSettings.mode === "DISABLED") {
      return { should: false, reason: "AI is disabled for this user" };
    }
    if (aiSettings.mode === "MANUAL") {
      return {
        should: false,
        reason: "AI is in MANUAL mode — awaiting explicit trigger",
      };
    }
    return { should: true, reason: "AI is in AUTOMATIC mode" };
  }

  async run(input: OrchestratorInput): Promise<OrchestratorResult> {
    aiLogger.step("INCOMING_MESSAGE", {
      receiverId: input.receiverId,
      conversationId: input.conversationId,
    });

    const ctx = await this.contextBuilder.build(
      input.receiverId,
      input.conversationId,
      input.incomingMessage
    );

    const { should, reason } = this.shouldRespond(ctx.aiSettings);
    if (!should) {
      aiLogger.info(`Skipping AI reply: ${reason}`, {
        receiverId: input.receiverId,
      });
      return { replied: false, reason };
    }

    aiLogger.step("PROMPT_BUILT", { receiverId: input.receiverId });
    const { systemPrompt, userPrompt } = this.promptBuilder.build(ctx);

    aiLogger.step("PROVIDER_SELECTED", {
      provider: this.provider.providerName,
    });
    const reply = await this.provider.generateReply(systemPrompt, userPrompt);

    aiLogger.step("RESPONSE_GENERATED", {
      provider: this.provider.providerName,
      replyLength: reply.length,
    });

    return { replied: true, reply };
  }

  async generateDraft(input: OrchestratorInput): Promise<string> {
    aiLogger.info("Generating draft (manual trigger)", {
      receiverId: input.receiverId,
    });

    const ctx = await this.contextBuilder.build(
      input.receiverId,
      input.conversationId,
      input.incomingMessage
    );

    aiLogger.step("PROMPT_BUILT", { receiverId: input.receiverId });
    const { systemPrompt, userPrompt } = this.promptBuilder.build(ctx);

    aiLogger.step("PROVIDER_SELECTED", {
      provider: this.provider.providerName,
    });
    const reply = await this.provider.generateReply(systemPrompt, userPrompt);

    aiLogger.step("RESPONSE_GENERATED", {
      provider: this.provider.providerName,
      replyLength: reply.length,
    });

    return reply;
  }
}
