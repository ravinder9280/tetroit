// ─── AI Pipeline Logger ───────────────────────────────────────────────────────
// Structured step-by-step logger for the AI pipeline.
// Each step is emitted in sequence so it's easy to trace the flow in logs.

const STEPS = [
  "INCOMING_MESSAGE",
  "LOADING_PROFILE",
  "LOADING_CONTEXT",
  "PROMPT_BUILT",
  "PROVIDER_SELECTED",
  "RESPONSE_GENERATED",
] as const;

export type PipelineStep = (typeof STEPS)[number];

function timestamp(): string {
  return new Date().toISOString();
}

export const aiLogger = {
  step(step: PipelineStep, meta?: Record<string, unknown>): void {
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    console.log(`[ai:${step}] ${timestamp()}${metaStr}`);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    console.log(`[ai:info] ${timestamp()} — ${message}${metaStr}`);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : "";
    console.warn(`[ai:warn] ${timestamp()} — ${message}${metaStr}`);
  },

  error(message: string, err?: unknown): void {
    console.error(`[ai:error] ${timestamp()} — ${message}`, err ?? "");
  },
};
