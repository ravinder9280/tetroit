"use client";

import { useQueryClient } from "@tanstack/react-query";
import type {
  AIDraftPayload,
  AITypingPayload,
  MessageReceivedPayload,
} from "@monorepo/types";
import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

export function useSocket(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const socket = connectSocket(userId);

    // ── message-received ─────────────────────────────────────────────────────
    function onMessageReceived(msg: MessageReceivedPayload) {
      // Invalidate the messages cache so TanStack re-fetches fresh data from DB.
      // Using setQueryData to append caused a split-brain: socket memory vs DB
      // (especially with the take:50 oldest-first limit), leading to missing or
      // duplicated messages after navigating away and back.
      queryClient.invalidateQueries({
        queryKey: ["messages", msg.conversationId],
      });

      // Clear any typing indicator for this conversation
      queryClient.setQueryData(["ai-typing", msg.conversationId], false);

      // Invalidate conversations so the sidebar re-sorts with the latest message
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    // ── ai-typing ────────────────────────────────────────────────────────────
    function onAiTyping(payload: AITypingPayload) {
      // Store typing state keyed by conversationId
      queryClient.setQueryData(["ai-typing", payload.conversationId], true);
    }

    // ── ai-draft ─────────────────────────────────────────────────────────────
    function onAiDraft(payload: AIDraftPayload) {
      // Store the draft keyed by conversationId so the chat page can read it
      queryClient.setQueryData(
        ["ai-draft", payload.conversationId],
        payload.draft
      );
    }

    socket.on("message-received", onMessageReceived);
    socket.on("ai-typing", onAiTyping);
    socket.on("ai-draft", onAiDraft);

    return () => {
      socket.off("message-received", onMessageReceived);
      socket.off("ai-typing", onAiTyping);
      socket.off("ai-draft", onAiDraft);
    };
  }, [userId, queryClient]);

  // Disconnect on full unmount (e.g. sign-out)
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return getSocket;
}
