// ─── Response Parser ──────────────────────────────────────────────────────────
// Single responsibility: extract and validate text from a raw Gemini SDK response.
// Never exposes the raw SDK GenerateContentResult outside this class.
// Throws typed errors so callers know exactly what went wrong.

import type { GenerateContentResult } from "@google/generative-ai";
import {
  AIEmptyResponseError,
  AIResponseBlockedError,
} from "../errors/ai-errors.js";
import { aiLogger } from "../utils/logger.js";

const PROVIDER_NAME = "GeminiProvider";

export class ResponseParser {
  /**
   * Parse a Gemini GenerateContentResult into a plain string reply.
   * @throws AIResponseBlockedError if the response was blocked by safety filters
   * @throws AIEmptyResponseError if no usable text was returned
   */
  parse(result: GenerateContentResult): string {
    const response = result.response;

    // ── Safety filter / blocked response ─────────────────────────────────────
    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
      aiLogger.warn("Response blocked by safety filter", {
        blockReason,
        safetyRatings: response.promptFeedback?.safetyRatings,
      });
      throw new AIResponseBlockedError(PROVIDER_NAME, String(blockReason));
    }

    // ── No candidates ─────────────────────────────────────────────────────────
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      aiLogger.warn("No candidates in Gemini response");
      throw new AIEmptyResponseError(PROVIDER_NAME);
    }

    const firstCandidate = candidates[0];

    // ── Candidate finish reason checks ────────────────────────────────────────
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

    // ── Extract text ─────────────────────────────────────────────────────────
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
