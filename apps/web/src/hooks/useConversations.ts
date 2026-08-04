import { useQuery } from "@tanstack/react-query";
import type { ConversationDTO } from "@monorepo/types";
import { api } from "../lib/api";

export function useConversations() {
  return useQuery<ConversationDTO[]>({
    queryKey: ["conversations"],
    queryFn: () => api.get<ConversationDTO[]>("/conversations"),
  });
}
