"use client";

import type { ConversationDTO, MessageDTO, UserPublic } from "@monorepo/types";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@monorepo/ui/components/avatar";
import { Button } from "@monorepo/ui/components/button";
import { Input } from "@monorepo/ui/components/input";
import { ScrollArea } from "@monorepo/ui/components/scroll-area";
import { Separator } from "@monorepo/ui/components/separator";
import { Skeleton } from "@monorepo/ui/components/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@monorepo/ui/components/dialog";
import {
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { signOut, useSession } from "../../../lib/auth-client";
import { getSocket } from "../../../lib/socket";
import { useConversations } from "../../../hooks/useConversations";
import { useMessages } from "../../../hooks/useMessages";
import { useSocket } from "../../../hooks/useSocket";
import { cn } from "../../../../../../packages/utils/src/styles";

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

// ─── New Chat Dialog ───────────────────────────────────────────────────────────

function NewChatDialog({
  onSelect,
}: {
  onSelect: (user: UserPublic) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get<UserPublic[]>("/users")
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="new-chat-btn" size="icon" variant="ghost" className="size-8">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="user-search-input"
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No users found
            </p>
          ) : (
            filtered.map((u) => (
              <button
                key={u.id}
                id={`user-item-${u.id}`}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent transition-colors text-left"
                onClick={() => {
                  onSelect(u);
                  setOpen(false);
                }}
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {initials(u.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{u.name}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {u.email}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conversation List Item ────────────────────────────────────────────────────

function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: ConversationDTO;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`conv-${conv.id}`}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback
          className={cn(
            "text-sm font-medium",
            active ? "bg-primary-foreground/20 text-primary-foreground" : ""
          )}
        >
          {initials(conv.otherUser.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">
            {conv.otherUser.name}
          </span>
          {conv.lastMessage && (
            <span
              className={cn(
                "text-xs shrink-0",
                active ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {formatTime(conv.lastMessage.createdAt)}
            </span>
          )}
        </div>
        {conv.lastMessage && (
          <p
            className={cn(
              "text-xs truncate",
              active ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {conv.lastMessage.content}
          </p>
        )}
      </div>
    </button>
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

// ─── Main Chat Page ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const queryClient = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<UserPublic | null>(null);
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Connect socket and set up real-time listener
  useSocket(session?.user?.id);

  const { data: conversations, isLoading: convsLoading } = useConversations();
  const { data: messages, isLoading: msgsLoading } = useMessages(activeConvId);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mutation: create or open a conversation
  const startConversation = useMutation({
    mutationFn: (participantId: string) =>
      api.post<ConversationDTO>("/conversations", { participantId }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(conv.id);
      setActiveOtherUser(conv.otherUser);
    },
  });

  // Send message via socket
  function sendMessage() {
    const content = messageText.trim();
    if (!content || !activeConvId || !activeOtherUser || !session?.user) return;

    const socket = getSocket();
    socket.emit("send-message", {
      conversationId: activeConvId,
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

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <MessageCircle className="size-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
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
    <div className="flex h-full bg-background">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 flex flex-col border-r border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" />
            <h1 className="font-semibold text-sm">Tetroit Chat</h1>
          </div>
          <div className="flex items-center gap-1">
            <NewChatDialog
              onSelect={(user) => startConversation.mutate(user.id)}
            />
            <Button
              id="sign-out-btn"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        {/* Current user info */}
        {me && (
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials(me.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{me.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{me.email}</p>
            </div>
          </div>
        )}

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 p-2">
            {convsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))
            ) : !conversations?.length ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <MessageCircle className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground">
                  Click <Plus className="inline size-3" /> to start one
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === activeConvId}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setActiveOtherUser(conv.otherUser);
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* ── Message Thread ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {!activeConvId ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No conversation selected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose one from the sidebar or start a new one
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-border">
              {activeOtherUser && (
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
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-4">
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
                  <p className="text-xs text-muted-foreground">
                    Say hello to {activeOtherUser?.name}!
                  </p>
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
                      <div className="flex flex-col gap-1.5">
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
                  placeholder={`Message ${activeOtherUser?.name ?? ""}…`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  className="flex-1"
                />
                <Button
                  id="send-btn"
                  size="icon"
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                >
                  <Send />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
