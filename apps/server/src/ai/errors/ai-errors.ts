// ─── AI Error Types ───────────────────────────────────────────────────────────
// Typed errors thrown by providers and parsers.
// Business logic catches these to decide how to respond gracefully.

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly providerName: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIResponseBlockedError extends AIProviderError {
  constructor(providerName: string, public readonly reason?: string) {
    super(
      `Response was blocked by ${providerName}${reason ? `: ${reason}` : ""}`,
      providerName
    );
    this.name = "AIResponseBlockedError";
  }
}

export class AIEmptyResponseError extends AIProviderError {
  constructor(providerName: string) {
    super(`${providerName} returned an empty response`, providerName);
    this.name = "AIEmptyResponseError";
  }
}

export class AITimeoutError extends AIProviderError {
  constructor(providerName: string, timeoutMs: number) {
    super(
      `${providerName} request timed out after ${timeoutMs}ms`,
      providerName
    );
    this.name = "AITimeoutError";
  }
}

/** Safe user-facing fallback message */
export const AI_FALLBACK_REPLY = "Unable to generate AI reply.";
