"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Clock,
  Loader2,
  MessageSquare,
  Save,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@monorepo/ui/components/button";
import { Skeleton } from "@monorepo/ui/components/skeleton";
import { Label } from "@monorepo/ui/components/label";
import { useAISettings } from "@/hooks/useAISettings";
import type { AiMode, TriggerType } from "@monorepo/types";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const aiSettingsSchema = z.object({
  mode: z.enum(["DISABLED", "MANUAL", "AUTOMATIC"]),
  triggerType: z.enum(["ALWAYS", "WHEN_OFFLINE", "AFTER_INACTIVITY"]),
  inactivityMinutes: z.number().int().min(1).max(1440),
  customInstructions: z.string().max(1000).optional().or(z.literal("")),
});

type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

// ─── Mode Card ─────────────────────────────────────────────────────────────────

function ModeCard({
  value,
  current,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  value: AiMode;
  current: AiMode;
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      id={`mode-card-${value.toLowerCase()}`}
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}
          >
            {title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
        {active && (
          <div className="ml-auto shrink-0 size-4 rounded-full bg-primary flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Trigger Option ────────────────────────────────────────────────────────────

function TriggerOption({
  value,
  current,
  label,
  icon: Icon,
  onClick,
}: {
  value: TriggerType;
  current: TriggerType;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      id={`trigger-${value.toLowerCase()}`}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all ${
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AISettingsPage() {
  const router = useRouter();
  const { data: settings, isLoading, updateSettings } = useAISettings();

  const {
    handleSubmit,
    watch,
    setValue,
    register,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      mode: "DISABLED",
      triggerType: "ALWAYS",
      inactivityMinutes: 5,
      customInstructions: "",
    },
  });

  const watchedMode = watch("mode");
  const watchedTrigger = watch("triggerType");

  useEffect(() => {
    if (settings) {
      reset({
        mode: settings.mode as AiMode,
        triggerType: settings.triggerType as TriggerType,
        inactivityMinutes: settings.inactivityMinutes,
        customInstructions: settings.customInstructions ?? "",
      });
    }
  }, [settings, reset]);

  async function onSubmit(values: AISettingsFormValues): Promise<void> {
    await updateSettings.mutateAsync({
      mode: values.mode,
      triggerType: values.triggerType,
      inactivityMinutes: values.inactivityMinutes,
      customInstructions: values.customInstructions || null,
    });
  }

  const isSaving = isSubmitting || updateSettings.isPending;
  const isAiEnabled = watchedMode !== "DISABLED";

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Button
          id="ai-settings-back-btn"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">AI Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure your personal AI agent
            </p>
          </div>
        </div>

        {/* AI enabled indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isAiEnabled ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            {isAiEnabled ? "AI Active" : "AI Off"}
          </span>
          <div
            className={`size-2 rounded-full ${
              isAiEnabled ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"
            }`}
          />
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <form
              id="ai-settings-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-8"
            >
              {/* ── Save banner ─────────────────────────────────────── */}
              {(isDirty || updateSettings.isSuccess) && (
                <div
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm border ${
                    updateSettings.isSuccess
                      ? "bg-green-500/10 border-green-500/30 text-green-600"
                      : "bg-primary/5 border-primary/20 text-primary"
                  }`}
                >
                  <span>
                    {updateSettings.isSuccess
                      ? "✓ Settings saved"
                      : "You have unsaved changes"}
                  </span>
                  {isDirty && (
                    <Button
                      id="ai-settings-save-top-btn"
                      type="submit"
                      size="sm"
                      disabled={isSaving}
                      className="h-7 text-xs"
                    >
                      {isSaving ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  )}
                </div>
              )}

              {/* ── Section: Mode ──────────────────────────────────── */}
              <section className="space-y-3">
                <div>
                  <h2 className="text-sm font-semibold">AI Mode</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose how your AI agent behaves when you receive messages.
                  </p>
                </div>

                <div className="space-y-2">
                  <Controller
                    name="mode"
                    control={control}
                    render={({ field }) => (
                      <>
                        <ModeCard
                          value="DISABLED"
                          current={field.value as AiMode}
                          title="Disabled"
                          description="Your AI agent is off. No automatic replies will be sent."
                          icon={WifiOff}
                          onClick={() => field.onChange("DISABLED")}
                        />
                        <ModeCard
                          value="MANUAL"
                          current={field.value as AiMode}
                          title="Manual"
                          description="AI is ready but only replies when you explicitly trigger it."
                          icon={Zap}
                          onClick={() => field.onChange("MANUAL")}
                        />
                        <ModeCard
                          value="AUTOMATIC"
                          current={field.value as AiMode}
                          title="Automatic"
                          description="AI replies on your behalf automatically based on your trigger settings."
                          icon={Bot}
                          onClick={() => field.onChange("AUTOMATIC")}
                        />
                      </>
                    )}
                  />
                </div>
              </section>

              {/* ── Section: Trigger (only visible in AUTOMATIC mode) ── */}
              {watchedMode === "AUTOMATIC" && (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold">Trigger Condition</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When should the AI reply automatically?
                    </p>
                  </div>

                  <Controller
                    name="triggerType"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2">
                        <TriggerOption
                          value="ALWAYS"
                          current={field.value as TriggerType}
                          label="Every Message"
                          icon={MessageSquare}
                          onClick={() => field.onChange("ALWAYS")}
                        />
                        <TriggerOption
                          value="WHEN_OFFLINE"
                          current={field.value as TriggerType}
                          label="When I'm Offline"
                          icon={WifiOff}
                          onClick={() => field.onChange("WHEN_OFFLINE")}
                        />
                        <TriggerOption
                          value="AFTER_INACTIVITY"
                          current={field.value as TriggerType}
                          label="After Inactivity"
                          icon={Clock}
                          onClick={() => field.onChange("AFTER_INACTIVITY")}
                        />
                      </div>
                    )}
                  />

                  {/* Inactivity minutes (only when AFTER_INACTIVITY) */}
                  {watchedTrigger === "AFTER_INACTIVITY" && (
                    <div className="space-y-1.5 pl-1">
                      <Label
                        htmlFor="inactivity-minutes"
                        className="text-xs text-muted-foreground"
                      >
                        Inactivity threshold (minutes)
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="inactivity-minutes"
                          type="number"
                          min={1}
                          max={1440}
                          className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          {...register("inactivityMinutes")}
                        />
                        <span className="text-xs text-muted-foreground">
                          minutes
                        </span>
                      </div>
                      {errors.inactivityMinutes && (
                        <p className="text-xs text-destructive">
                          {errors.inactivityMinutes.message}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ── Section: Custom Instructions ─────────────────────── */}
              {isAiEnabled && (
                <section className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold">Custom Instructions</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Extra context or rules for your AI agent. These override the
                      default behaviour.
                    </p>
                  </div>
                  <textarea
                    id="custom-instructions"
                    placeholder="e.g. Always respond in formal English. Never share personal information. Keep replies under 3 sentences."
                    rows={4}
                    className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    {...register("customInstructions")}
                  />
                  {errors.customInstructions && (
                    <p className="text-xs text-destructive">
                      {errors.customInstructions.message}
                    </p>
                  )}
                </section>
              )}

              {/* ── Error ──────────────────────────────────────────── */}
              {updateSettings.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {updateSettings.error.message}
                </div>
              )}

              {/* ── Save button ─────────────────────────────────────── */}
              <Button
                id="ai-settings-save-btn"
                type="submit"
                disabled={isSaving || !isDirty}
                className="w-full gap-2"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSaving ? "Saving…" : "Save Settings"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
