"use client";

import type { MessageDTO } from "@monorepo/types";
import { Avatar, AvatarFallback } from "@monorepo/ui/components/avatar";
import { Button } from "@monorepo/ui/components/button";
import { ScrollArea } from "@monorepo/ui/components/scroll-area";
import { Separator } from "@monorepo/ui/components/separator";
import { Skeleton } from "@monorepo/ui/components/skeleton";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getSocket } from "@/lib/socket";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@monorepo/utils";
import { AISettingsDialog } from "@/components/ai-settings-dialog";

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

// ─── AI Typing Indicator ──────────────────────────────────────────────────────

function TypingIndicator({ name }: { name: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
        <Bot className="size-3.5 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground">{name}&apos;s AI is typing</span>
        <span className="flex gap-0.5 items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
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
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm relative",
          isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {/* AI badge */}
        {msg.isAI && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[9px] font-medium rounded-full px-1.5 py-0.5 mb-1",
              isMine
                ? "bg-primary-foreground/20 text-primary-foreground/80"
                : "bg-primary/10 text-primary"
            )}
          >
            <Sparkles className="size-2.5" />
            AI
          </span>
        )}
        <p className="break-words text-[0.88rem] sm:text-[0.95rem]   leading-snug mt-0.5  whitespace-pre-wrap">{msg.content}</p>
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

// ─── AI Draft Banner ─────────────────────────────────────────────────────────

function AIDraftBanner({
  draft,
  onUse,
  onDismiss,
}: {
  draft: string;
  onUse: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-6 mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="size-3.5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary mb-1">AI Draft</p>
          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
            {draft}
          </p>
        </div>
        <button
          id="dismiss-draft-btn"
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex justify-end mt-2">
        <Button
          id="use-draft-btn"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={onUse}
        >
          <Sparkles className="size-3" />
          Use this reply
        </Button>
      </div>
    </div>
  );
}

// ─── Active Chat Page ──────────────────────────────────────────────────────────

export default function ChatDetailPage() {
  const params = useParams();
  const conversationId = params?.conversationId as string;
  const queryClient = useQueryClient();

  const { data: session } = useSession();
  const { data: conversations } = useConversations();
  const { data: messages, isLoading: msgsLoading } = useMessages(conversationId);

  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Find the other user in cached conversations
  const activeConv = conversations?.find((c) => c.id === conversationId);
  const activeOtherUser = activeConv?.otherUser;

  // AI state — use useQuery so React re-renders reactively when useSocket
  // writes to these keys via queryClient.setQueryData()
  const { data: isAiTyping = false } = useQuery<boolean>({
    queryKey: ["ai-typing", conversationId],
    queryFn: () => false,     // never runs (enabled:false) — only reads what useSocket writes
    enabled: false,
    staleTime: Infinity,
  });
  const { data: aiDraft } = useQuery<string>({
    queryKey: ["ai-draft", conversationId],
    queryFn: (): string => "",  // never runs (enabled:false) — only reads what useSocket writes
    enabled: false,
    staleTime: Infinity,
  });

  // Scroll to bottom when messages change or typing indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

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
    // Clear any existing draft when user sends manually
    queryClient.setQueryData(["ai-draft", conversationId], null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function useDraft() {
    if (aiDraft) {
      setMessageText(aiDraft);
      queryClient.setQueryData(["ai-draft", conversationId], null);
    }
  }

  function dismissDraft() {
    queryClient.setQueryData(["ai-draft", conversationId], null);
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
      <div className="flex items-center gap-3 px-6 h-15 border-b border-border">
        {activeOtherUser ? (
          <>
            <Avatar className="size-10">
              <AvatarFallback className="text-sm">
                {initials(activeOtherUser.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{activeOtherUser.name}</p>
              <p className="text-sm text-muted-foreground">
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
      <ScrollArea className="flex-1 px-6">
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

            {/* AI Typing Indicator */}
            {isAiTyping && activeOtherUser && (
              <TypingIndicator name={activeOtherUser.name} />
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* AI Draft Banner (MANUAL mode) */}
      {aiDraft && (
        <AIDraftBanner
          draft={aiDraft}
          onUse={useDraft}
          onDismiss={dismissDraft}
        />
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-6 py-4 border-t border-border">
        <div className="relative flex-1 flex items-center gap-2 rounded-xs bg-zinc-900 p-1.5 border border-white/10">
          <textarea
            id="message-input"
            placeholder={"Type Your Message"}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="flex h-[40px] w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none  disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!activeOtherUser}
          />
          <Button
            id="send-btn"
            size="icon"
            className=""
            onClick={sendMessage}
            disabled={!messageText.trim() || !activeOtherUser}
          >
            <Send />
          </Button>
        </div>
            <AISettingsDialog
                        trigger={
                          <Button
                            id="ai-settings-nav-btn"
                            variant="outline"
                            title="AI Settings"
                            className="h-[52px]"

                          >
                            <Bot className="size-6" />
                            AI Settings
                          </Button>
                        }
                      />
      </div>
    </>
  );
}
