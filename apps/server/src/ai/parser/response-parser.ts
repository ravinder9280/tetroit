import type { GenerateContentResult } from "@google/generative-ai";
import {
  AIEmptyResponseError,
  AIResponseBlockedError,
} from "../errors/ai-errors.js";
import { aiLogger } from "../utils/logger.js";

const PROVIDER_NAME = "GeminiProvider";

export class ResponseParser {
  parse(result: GenerateContentResult): string {
    const response = result.response;

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
      aiLogger.warn("Response blocked by safety filter", {
        blockReason,
        safetyRatings: response.promptFeedback?.safetyRatings,
      });
      throw new AIResponseBlockedError(PROVIDER_NAME, String(blockReason));
    }

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      aiLogger.warn("No candidates in Gemini response");
      throw new AIEmptyResponseError(PROVIDER_NAME);
    }

    const firstCandidate = candidates[0];

    const finishReason = firstCandidate?.finishReason;
    if (finishReason === "SAFETY") {
      throw new AIResponseBlockedError(
        PROVIDER_NAME,
        "Candidate blocked by SAFETY filter"
      );
    }
    if (finishReason === "RECITATION") {
      throw new AIResponseBlockedError(
        PROVIDER_NAME,
        "Candidate blocked due to RECITATION"
      );
    }

    let text: string;
    try {
      text = response.text();
    } catch {
      throw new AIEmptyResponseError(PROVIDER_NAME);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new AIEmptyResponseError(PROVIDER_NAME);
    }

    return trimmed;
  }
}
