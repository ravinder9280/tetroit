"use client";

import type { ConversationDTO, UserPublic } from "@monorepo/types";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@monorepo/ui/components/avatar";
import { Button } from "@monorepo/ui/components/button";
import { Input } from "@monorepo/ui/components/input";
import { ScrollArea } from "@monorepo/ui/components/scroll-area";
import { Skeleton } from "@monorepo/ui/components/skeleton";
import { AISettingsDialog } from "@/components/ai-settings-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@monorepo/ui/components/dialog";
import {
  Bot,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  UserCircle2,
} from "lucide-react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { useConversations } from "@/hooks/useConversations";
import { useSocket } from "@/hooks/useSocket";
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

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const activeConvId = params?.conversationId as string | undefined;

  const { data: session, isPending: sessionLoading } = useSession();
  const queryClient = useQueryClient();

  // Connect socket and set up real-time listener
  useSocket(session?.user?.id);

  const { data: conversations, isLoading: convsLoading } = useConversations();

  // Mutation: create or open a conversation
  const startConversation = useMutation({
    mutationFn: (participantId: string) =>
      api.post<ConversationDTO>("/conversations", { participantId }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chat/${conv.id}`);
    },
  });

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

  return (
    <div className="flex h-full bg-background">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 md:flex flex-col border-r border-border hidden ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-15 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" />
            <h1 className="font-semibold text-sm">Tetroit Chat</h1>
          </div>
          <div className="flex items-center gap-1">
            <NewChatDialog
              onSelect={(user) => startConversation.mutate(user.id)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 min-w-0">
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
                  onClick={() => router.push(`/chat/${conv.id}`)}
                />
              ))
            )}
          </div>
        </div>

        {/* Current user info */}
        {me && (
          <div className="flex items-center gap-2.5 px-4 py-3 border-t bg-neutral-800/50 border-border ">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials(me.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{me.name}</p>
              <p className="text-xs text-muted-foreground truncate">{me.email}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                id="profile-nav-btn"
                size="icon"
                variant="ghost"
                className={cn(
                  "size-8",
                  pathname === "/chat/profile" && "bg-accent text-accent-foreground"
                )}
                onClick={() => router.push("/chat/profile")}
                title="Profile"
              >
                <UserCircle2 className="size-4" />
              </Button>
              <AISettingsDialog
                trigger={
                  <Button
                    id="ai-settings-nav-btn"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    title="AI Settings"
                  >
                    <Bot className="size-4" />
                  </Button>
                }
              />
              <Button
                id="sign-out-btn"
                size="icon"
                variant="ghost"
                className="size-8 text-red-400"
                onClick={handleSignOut}
                title="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content (subpage) ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
