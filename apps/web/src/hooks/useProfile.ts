"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserProfile, UpdateUserProfileBody } from "@monorepo/types";

export function useProfile() {
  const queryClient = useQueryClient();

  const query = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/users/me/profile"),
    staleTime: 60_000,
  });

  const mutation = useMutation<UserProfile, Error, UpdateUserProfileBody>({
    mutationFn: (body) => api.put<UserProfile>("/users/me/profile", body),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
    },
  });

  return { ...query, updateProfile: mutation };
}
