import { useQuery } from "@tanstack/react-query";
import type { MessageDTO } from "@monorepo/types";
import { api } from "../lib/api";

export function useMessages(conversationId: string | null) {
  return useQuery<MessageDTO[]>({
    queryKey: ["messages", conversationId],
    queryFn: () =>
      api.get<MessageDTO[]>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  });
}
