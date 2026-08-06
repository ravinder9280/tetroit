"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AISettingsDTO, UpdateAISettingsBody } from "@monorepo/types";

export function useAISettings() {
  const queryClient = useQueryClient();

  const query = useQuery<AISettingsDTO>({
    queryKey: ["ai-settings"],
    queryFn: () => api.get<AISettingsDTO>("/ai-settings"),
    staleTime: 60_000,
  });

  const mutation = useMutation<AISettingsDTO, Error, UpdateAISettingsBody>({
    mutationFn: (body) => api.put<AISettingsDTO>("/ai-settings", body),
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-settings"], data);
    },
  });

  return { ...query, updateSettings: mutation };
}
