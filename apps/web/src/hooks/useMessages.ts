import { useQuery } from "@tanstack/react-query";
import type { MessageDTO } from "@monorepo/types";
import { api } from "../lib/api";

export function useMessages(conversationId: string | null) {
  return useQuery<MessageDTO[]>({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get<MessageDTO[]>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    staleTime: 0,            // always consider data stale
    refetchOnMount: "always", // always re-fetch from DB on mount, even if cache exists
    refetchOnWindowFocus: true, // re-fetch when tab regains focus
  });
}
