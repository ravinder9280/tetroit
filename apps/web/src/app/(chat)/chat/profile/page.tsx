"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, UserCircle2 } from "lucide-react";
import { Button } from "@monorepo/ui/components/button";
import { Input } from "@monorepo/ui/components/input";
import { Label } from "@monorepo/ui/components/label";
import { Skeleton } from "@monorepo/ui/components/skeleton";
import { useProfile } from "@/hooks/useProfile";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  bio: z.string().max(500, "Max 500 characters").optional().or(z.literal("")),
  profession: z
    .string()
    .max(100, "Max 100 characters")
    .optional()
    .or(z.literal("")),
  interests: z
    .string()
    .max(300, "Max 300 characters")
    .optional()
    .or(z.literal("")),
  personality: z
    .string()
    .max(200, "Max 200 characters")
    .optional()
    .or(z.literal("")),
  communicationStyle: z
    .string()
    .max(200, "Max 200 characters")
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// ─── Field Component ──────────────────────────────────────────────────────────

function FormField({
  id,
  label,
  description,
  placeholder,
  error,
  multiline,
  children,
}: {
  id: string;
  label: string;
  description: string;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading, updateProfile } = useProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      profession: "",
      interests: "",
      personality: "",
      communicationStyle: "",
    },
  });

  // Populate form once profile loads
  useEffect(() => {
    if (profile) {
      reset({
        bio: profile.bio ?? "",
        profession: profile.profession ?? "",
        interests: profile.interests ?? "",
        personality: profile.personality ?? "",
        communicationStyle: profile.communicationStyle ?? "",
      });
    }
  }, [profile, reset]);

  async function onSubmit(values: ProfileFormValues) {
    await updateProfile.mutateAsync({
      bio: values.bio || null,
      profession: values.profession || null,
      interests: values.interests || null,
      personality: values.personality || null,
      communicationStyle: values.communicationStyle || null,
    });
  }

  const isSaving = isSubmitting || updateProfile.isPending;

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Button
          id="profile-back-btn"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle2 className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">Your Profile</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Help the AI understand how to represent you
            </p>
          </div>
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-8">
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <form
              id="profile-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* ── Save banner ─────────────────────────────────────── */}
              {(isDirty || updateProfile.isSuccess) && (
                <div
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm border ${
                    updateProfile.isSuccess
                      ? "bg-green-500/10 border-green-500/30 text-green-600"
                      : "bg-primary/5 border-primary/20 text-primary"
                  }`}
                >
                  <span>
                    {updateProfile.isSuccess
                      ? "✓ Profile saved successfully"
                      : "You have unsaved changes"}
                  </span>
                  {isDirty && (
                    <Button
                      id="profile-save-top-btn"
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

              {/* ── Bio ─────────────────────────────────────────────── */}
              <FormField
                id="profile-bio"
                label="Bio"
                description="A short description of yourself."
                error={errors.bio?.message}
              >
                <textarea
                  id="profile-bio"
                  placeholder="I'm a software engineer who loves hiking and photography..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  {...register("bio")}
                />
              </FormField>

              {/* ── Profession ─────────────────────────────────────── */}
              <FormField
                id="profile-profession"
                label="Profession"
                description="What do you do professionally?"
                error={errors.profession?.message}
              >
                <Input
                  id="profile-profession"
                  placeholder="e.g. Software Engineer, Designer, Teacher..."
                  {...register("profession")}
                />
              </FormField>

              {/* ── Interests ──────────────────────────────────────── */}
              <FormField
                id="profile-interests"
                label="Interests"
                description="Topics you enjoy — the AI will reference these."
                error={errors.interests?.message}
              >
                <Input
                  id="profile-interests"
                  placeholder="e.g. AI, music, climbing, cooking..."
                  {...register("interests")}
                />
              </FormField>

              {/* ── Personality ────────────────────────────────────── */}
              <FormField
                id="profile-personality"
                label="Personality"
                description="Describe your personality so the AI matches your tone."
                error={errors.personality?.message}
              >
                <Input
                  id="profile-personality"
                  placeholder="e.g. Friendly and direct, loves humour..."
                  {...register("personality")}
                />
              </FormField>

              {/* ── Communication Style ─────────────────────────────── */}
              <FormField
                id="profile-comm-style"
                label="Communication Style"
                description="How do you prefer to communicate?"
                error={errors.communicationStyle?.message}
              >
                <Input
                  id="profile-comm-style"
                  placeholder="e.g. Concise, uses emojis, formal..."
                  {...register("communicationStyle")}
                />
              </FormField>

              {/* ── Error message ──────────────────────────────────── */}
              {updateProfile.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {updateProfile.error.message}
                </div>
              )}

              {/* ── Save button ─────────────────────────────────────── */}
              <Button
                id="profile-save-btn"
                type="submit"
                disabled={isSaving || !isDirty}
                className="w-full gap-2"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSaving ? "Saving…" : "Save Profile"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
