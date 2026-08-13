// ─── AI Orchestrator ──────────────────────────────────────────────────────────
// Central coordinator of the AI pipeline.
// Depends only on interfaces — never on concrete provider implementations.
//
// Pipeline:
//   shouldRespond() check
//     → ContextBuilder.build()
//     → PromptBuilder.build()
//     → LLMProvider.generateReply()
//     → return reply

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

  /**
   * Determine whether the AI should reply to an incoming message.
   * Business logic lives here — isolated from DB and LLM concerns.
   */
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
    // AUTOMATIC
    return { should: true, reason: "AI is in AUTOMATIC mode" };
  }

  /**
   * Run the full pipeline and return the AI reply (or a no-op result).
   */
  async run(input: OrchestratorInput): Promise<OrchestratorResult> {
    aiLogger.step("INCOMING_MESSAGE", {
      receiverId: input.receiverId,
      conversationId: input.conversationId,
    });

    // Build context (includes receiver profile + AI settings + history)
    const ctx = await this.contextBuilder.build(
      input.receiverId,
      input.conversationId,
      input.incomingMessage
    );

    // Decide whether to respond
    const { should, reason } = this.shouldRespond(ctx.aiSettings);
    if (!should) {
      aiLogger.info(`Skipping AI reply: ${reason}`, {
        receiverId: input.receiverId,
      });
      return { replied: false, reason };
    }

    // Build prompts
    aiLogger.step("PROMPT_BUILT", { receiverId: input.receiverId });
    const { systemPrompt, userPrompt } = this.promptBuilder.build(ctx);

    // Select and call provider
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

  /**
   * Generate a draft reply regardless of AI mode.
   * Used for the MANUAL trigger flow where the user explicitly requests a draft.
   * Bypasses shouldRespond() — always runs the full pipeline.
   */
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
