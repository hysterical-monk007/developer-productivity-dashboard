"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Plus,
  Users,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PresenceDot } from "@/components/team/presence-dot";
import { MemberAvatar } from "@/components/team/member-avatar";
import {
  useTeam,
  useCurrentMember,
  type TeamMember,
} from "@/lib/team-store";
import { usePresence } from "@/lib/presence-engine";
import { useChat, type ChatThread } from "@/lib/chat-store";
import { NewThreadDialog } from "./new-thread-dialog";
import { cn } from "@/lib/utils";

function threadDisplayName(
  thread: ChatThread,
  byId: Map<string, TeamMember>,
  meId: string
): string {
  if (thread.kind === "group") return thread.name ?? "Group";
  const otherId = thread.memberIds.find((id) => id !== meId);
  return byId.get(otherId ?? "")?.name ?? "Conversation";
}

function relative(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

export function ChatDrawer({
  open,
  onClose,
  initialThreadId,
}: {
  open: boolean;
  onClose: () => void;
  initialThreadId?: string | null;
}) {
  const { team } = useTeam();
  const me = useCurrentMember();
  const meId = me?.id ?? "";
  const otherIds = team.filter((m) => m.id !== meId).map((m) => m.id);
  const { threads, send, markRead } = useChat(meId, otherIds);
  const presence = usePresence(team.map((m) => m.id));
  const byId = useMemo(
    () => new Map(team.map((m) => [m.id, m])),
    [team]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // When the drawer opens with an initialThreadId, focus that thread.
  useEffect(() => {
    if (open && initialThreadId) {
      setActiveId(initialThreadId);
    } else if (open && !activeId && threads.length > 0) {
      setActiveId(threads[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialThreadId]);

  // Mark thread read when the user opens it
  useEffect(() => {
    if (activeId) markRead(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, threads.find((t) => t.id === activeId)?.messages.length]);

  // Auto-scroll to bottom when new messages arrive in the active thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, threads.find((t) => t.id === activeId)?.messages.length]);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const sortedThreads = useMemo(
    () =>
      [...threads].sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.at ?? a.createdAt;
        const bLast = b.messages[b.messages.length - 1]?.at ?? b.createdAt;
        return bLast.localeCompare(aLast);
      }),
    [threads]
  );

  const handleSend = () => {
    if (!active || !draft.trim()) return;
    send(active.id, draft);
    setDraft("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass-strong fixed right-0 top-0 z-50 flex h-full w-full sm:w-[480px] lg:w-[640px] flex-col"
          >
            <header className="flex items-center gap-2 border-b border-foreground/[0.08] px-4 py-3">
              {active && (
                <button
                  onClick={() => setActiveId(null)}
                  aria-label="Back to threads"
                  className="sm:hidden inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <MessageSquare className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-semibold tracking-tight">Messages</h2>
                {threads.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    · {threads.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setNewThreadOpen(true)}
                aria-label="New thread"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                title="New conversation"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="flex flex-1 min-h-0">
              {/* Thread list (left rail on sm+) */}
              <div
                className={cn(
                  "border-r border-foreground/[0.08] flex flex-col",
                  "w-full sm:w-[240px]",
                  active && "hidden sm:flex"
                )}
              >
                <ScrollArea className="flex-1">
                  <ul className="p-2 space-y-0.5">
                    {sortedThreads.length === 0 && (
                      <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No conversations yet. Click + to start one.
                      </li>
                    )}
                    {sortedThreads.map((t) => {
                      const isActive = t.id === activeId;
                      const lastMsg = t.messages[t.messages.length - 1];
                      const otherId =
                        t.kind === "dm"
                          ? t.memberIds.find((id) => id !== meId) ?? ""
                          : "";
                      const otherPresence = otherId
                        ? presence[otherId]
                        : undefined;
                      const member =
                        t.kind === "dm" ? byId.get(otherId) : null;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => setActiveId(t.id)}
                            className={cn(
                              "w-full flex items-start gap-2.5 rounded-lg p-2 text-left transition-colors",
                              isActive
                                ? "bg-accent/50"
                                : "hover:bg-accent/30"
                            )}
                          >
                            <div className="relative shrink-0">
                              {t.kind === "dm" && member ? (
                                <>
                                  <MemberAvatar member={member} size={32} />
                                  {otherPresence && (
                                    <span className="absolute -bottom-0.5 -right-0.5">
                                      <PresenceDot
                                        status={otherPresence.status}
                                        size="sm"
                                      />
                                    </span>
                                  )}
                                </>
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/30">
                                  <Users className="h-3.5 w-3.5 text-emerald-300" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold truncate">
                                  {threadDisplayName(t, byId, meId)}
                                </p>
                                {t.kind === "group" && (
                                  <span className="text-[9px] text-muted-foreground shrink-0">
                                    · {t.memberIds.length}
                                  </span>
                                )}
                                {lastMsg && (
                                  <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
                                    {relative(lastMsg.at)}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                {lastMsg ? (
                                  <>
                                    {lastMsg.authorId === meId && "You: "}
                                    {lastMsg.text}
                                  </>
                                ) : (
                                  <span className="italic">No messages yet</span>
                                )}
                              </p>
                            </div>
                            {t.unread > 0 && !isActive && (
                              <span className="shrink-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-emerald-950">
                                {t.unread}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </div>

              {/* Message view (right pane) */}
              <div
                className={cn(
                  "flex-1 min-w-0 flex flex-col",
                  !active && "hidden sm:flex"
                )}
              >
                {active ? (
                  <>
                    {/* Thread header */}
                    <div className="border-b border-foreground/[0.08] px-4 py-2.5 flex items-center gap-2">
                      {active.kind === "dm"
                        ? (() => {
                            const otherId =
                              active.memberIds.find((id) => id !== meId) ?? "";
                            const m = byId.get(otherId);
                            const pres = presence[otherId];
                            if (!m) return null;
                            return (
                              <>
                                <MemberAvatar member={m} size={28} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">
                                    {m.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    {pres && (
                                      <PresenceDot
                                        status={pres.status}
                                        size="sm"
                                      />
                                    )}
                                    {pres?.isTyping
                                      ? "typing…"
                                      : pres?.status === "online"
                                        ? "active now"
                                        : pres?.status === "away"
                                          ? "away"
                                          : `last seen ${pres?.lastSeen ?? "—"} ago`}
                                  </p>
                                </div>
                              </>
                            );
                          })()
                        : (
                          <>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/30">
                              <Users className="h-3.5 w-3.5 text-emerald-300" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {active.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {active.memberIds.length} members
                              </p>
                            </div>
                          </>
                        )}
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-4 py-3">
                      <ol className="space-y-3">
                        {active.messages.length === 0 && (
                          <li className="text-center text-xs text-muted-foreground py-8">
                            No messages yet. Say hi 👋
                          </li>
                        )}
                        {active.messages.map((msg) => {
                          const isMe = msg.authorId === meId;
                          const author = byId.get(msg.authorId);
                          return (
                            <li
                              key={msg.id}
                              className={cn(
                                "flex gap-2 items-end",
                                isMe && "flex-row-reverse"
                              )}
                            >
                              {!isMe && author && (
                                <MemberAvatar
                                  member={author}
                                  size={24}
                                  className="shrink-0"
                                />
                              )}
                              <div
                                className={cn(
                                  "min-w-0 max-w-[75%] space-y-0.5",
                                  isMe && "items-end flex flex-col"
                                )}
                              >
                                {!isMe && author && active.kind === "group" && (
                                  <p className="text-[10px] text-muted-foreground px-2">
                                    {author.name}
                                  </p>
                                )}
                                <div
                                  className={cn(
                                    "rounded-2xl px-3 py-1.5 text-sm leading-snug",
                                    isMe
                                      ? "bg-emerald-500 text-emerald-950 rounded-br-sm"
                                      : "bg-accent/60 text-foreground rounded-bl-sm"
                                  )}
                                >
                                  {msg.text}
                                </div>
                                <p
                                  className={cn(
                                    "text-[9px] text-muted-foreground px-1",
                                    isMe && "text-right"
                                  )}
                                >
                                  {relative(msg.at)}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                        {/* Other-side typing indicator */}
                        {(() => {
                          const typingOthers = active.memberIds
                            .filter((id) => id !== meId)
                            .filter((id) => presence[id]?.isTyping);
                          if (typingOthers.length === 0) return null;
                          return (
                            <li className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/60">
                                <span className="flex gap-0.5">
                                  <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse" />
                                  <span
                                    className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse"
                                    style={{ animationDelay: "0.15s" }}
                                  />
                                  <span
                                    className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse"
                                    style={{ animationDelay: "0.3s" }}
                                  />
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {byId.get(typingOthers[0])?.name ?? "someone"} is
                                typing…
                              </span>
                            </li>
                          );
                        })()}
                        <div ref={messagesEndRef} />
                      </ol>
                    </ScrollArea>

                    {/* Composer */}
                    <div className="border-t border-foreground/[0.08] p-3 flex items-center gap-2">
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Type a message…"
                        className="flex-1 bg-background/40"
                      />
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!draft.trim()}
                        className="h-9 w-9 bg-foreground text-background hover:bg-foreground/90"
                        aria-label="Send"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center px-6">
                    <div>
                      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/30">
                        <MessageSquare className="h-5 w-5 text-emerald-300" />
                      </div>
                      <p className="mt-3 text-sm font-medium">Pick a thread</p>
                      <p className="mt-1 text-xs text-muted-foreground max-w-[240px] mx-auto">
                        Or click the <strong>+</strong> in the header to start a
                        new DM or group chat.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>

          <NewThreadDialog
            open={newThreadOpen}
            onClose={() => setNewThreadOpen(false)}
            onCreated={(id) => setActiveId(id)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
