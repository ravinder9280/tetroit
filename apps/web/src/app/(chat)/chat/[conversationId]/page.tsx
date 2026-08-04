"use client";

import type { MessageDTO } from "@monorepo/types";
import { Avatar, AvatarFallback } from "@monorepo/ui/components/avatar";
import { Button } from "@monorepo/ui/components/button";
import { Input } from "@monorepo/ui/components/input";
import { ScrollArea } from "@monorepo/ui/components/scroll-area";
import { Separator } from "@monorepo/ui/components/separator";
import { Skeleton } from "@monorepo/ui/components/skeleton";
import { Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getSocket } from "@/lib/socket";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { cn } from "@monorepo/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

// ─── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMine,
}: {
  msg: MessageDTO;
  isMine: boolean;
}) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        <p className="break-words">{msg.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isMine ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

// ─── Active Chat Page ──────────────────────────────────────────────────────────

export default function ChatDetailPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;

  const { data: session } = useSession();
  const { data: conversations } = useConversations();
  const { data: messages, isLoading: msgsLoading } = useMessages(conversationId);

  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Find the other user in cached conversations
  const activeConv = conversations?.find((c) => c.id === conversationId);
  const activeOtherUser = activeConv?.otherUser;

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message via socket
  function sendMessage() {
    const content = messageText.trim();
    if (!content || !conversationId || !activeOtherUser || !session?.user) return;

    const socket = getSocket();
    socket.emit("send-message", {
      conversationId,
      receiverId: activeOtherUser.id,
      content,
    });

    setMessageText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const me = session?.user;

  // Group messages by date
  const grouped: { date: string; msgs: MessageDTO[] }[] = [];
  if (messages) {
    for (const msg of messages) {
      const date = formatDate(msg.createdAt);
      const last = grouped[grouped.length - 1];
      if (last?.date === date) {
        last.msgs.push(msg);
      } else {
        grouped.push({ date, msgs: [msg] });
      }
    }
  }

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
        {activeOtherUser ? (
          <>
            <Avatar className="size-8">
              <AvatarFallback className="text-sm">
                {initials(activeOtherUser.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{activeOtherUser.name}</p>
              <p className="text-xs text-muted-foreground">
                {activeOtherUser.email}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 ">
        {msgsLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-2/3" : "w-1/2 self-end")}
              />
            ))}
          </div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            {activeOtherUser && (
              <p className="text-xs text-muted-foreground">
                Say hello to {activeOtherUser.name}!
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(({ date, msgs }) => (
              <div key={date} className="flex flex-col gap-2">
                {/* Date separator */}
                <div className="flex items-center gap-3 py-1">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {date}
                  </span>
                  <Separator className="flex-1" />
                </div>
                <div className="flex flex-col gap-4">
                  {msgs.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={msg.senderId === me?.id}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            id="message-input"
            placeholder={activeOtherUser ? `Message ${activeOtherUser.name}…` : "Message…"}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="flex-1"
            disabled={!activeOtherUser}
          />
          <Button
            id="send-btn"
            size="icon"
            onClick={sendMessage}
            disabled={!messageText.trim() || !activeOtherUser}
          >
            <Send />
          </Button>
        </div>
      </div>
    </>
  );
}
