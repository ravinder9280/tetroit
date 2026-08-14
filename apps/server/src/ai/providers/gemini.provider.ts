import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import type { LLMProvider } from "../interfaces/llm-provider.interface.js";
import { ResponseParser } from "../parser/response-parser.js";
import {
  AI_FALLBACK_REPLY,
  AIProviderError,
} from "../errors/ai-errors.js";
import { aiLogger } from "../utils/logger.js";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[GeminiProvider] Missing required environment variable: ${key}`
    );
  }
  return value;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

export class GeminiProvider implements LLMProvider {
  readonly providerName = "GeminiProvider";

  private readonly client: GoogleGenerativeAI;
  private readonly parser: ResponseParser;
  private readonly modelName: string;

  constructor() {
    const apiKey = requireEnv("GEMINI_API_KEY");
    this.modelName = process.env["GEMINI_MODEL"] ?? DEFAULT_MODEL;

    this.client = new GoogleGenerativeAI(apiKey);
    this.parser = new ResponseParser();

    aiLogger.info(`[AI] GeminiProvider initialised`, { model: this.modelName });
  }

  async generateReply(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    aiLogger.step("GEMINI_REQUEST", { model: this.modelName });
    const startMs = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: systemPrompt,
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent(userPrompt);

      const latencyMs = Date.now() - startMs;

      const usageMetadata = result.response.usageMetadata;
      aiLogger.step("GEMINI_RESPONSE", {
        latencyMs,
        promptTokens: usageMetadata?.promptTokenCount ?? "n/a",
        candidateTokens: usageMetadata?.candidatesTokenCount ?? "n/a",
        totalTokens: usageMetadata?.totalTokenCount ?? "n/a",
      });

      aiLogger.info("[AI] Parsing response");
      return this.parser.parse(result);
    } catch (err) {
      const latencyMs = Date.now() - startMs;

      if (err instanceof AIProviderError) {
        aiLogger.error(`[AI] ${this.providerName} typed error after ${latencyMs}ms`, err);
        throw err;
      }

      const message =
        err instanceof Error ? err.message : "Unknown Gemini error";

      if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
        aiLogger.error(`[AI] ${this.providerName} rate-limit hit after ${latencyMs}ms`, { error: message });
      } else if (message.includes("timeout") || message.toLowerCase().includes("deadline")) {
        aiLogger.error(`[AI] ${this.providerName} request timed out after ${latencyMs}ms`, { error: message });
      } else if (message.includes("API key") || message.includes("401") || message.includes("403")) {
        aiLogger.error(`[AI] ${this.providerName} authentication error after ${latencyMs}ms`, { error: message });
      } else {
        aiLogger.error(`[AI] ${this.providerName} API call failed after ${latencyMs}ms`, { error: message });
      }

      throw new AIProviderError(message, this.providerName, err);
    }
  }
}

let _instance: GeminiProvider | null = null;

export function getGeminiProvider(): GeminiProvider {
  if (!_instance) {
    _instance = new GeminiProvider();
  }
  return _instance;
}

export { AI_FALLBACK_REPLY };
