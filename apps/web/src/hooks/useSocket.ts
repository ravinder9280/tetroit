"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { MessageReceivedPayload } from "@monorepo/types";
import { useEffect } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";

export function useSocket(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const socket = connectSocket(userId);

    function onMessageReceived(msg: MessageReceivedPayload) {
      // Append to the messages list for this conversation
      queryClient.setQueryData<MessageReceivedPayload[]>(
        ["messages", msg.conversationId],
        (old) => (old ? [...old, msg] : [msg])
      );

      // Invalidate conversations so the sidebar re-sorts with the latest message
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }

    socket.on("message-received", onMessageReceived);

    return () => {
      socket.off("message-received", onMessageReceived);
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
