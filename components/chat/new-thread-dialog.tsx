"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, MessageSquare, Check } from "lucide-react";
import { MemberAvatar } from "@/components/team/member-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeam, useCurrentMember } from "@/lib/team-store";
import { useChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

export function NewThreadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (threadId: string) => void;
}) {
  const { team } = useTeam();
  const me = useCurrentMember();
  const meId = me?.id ?? "";
  const others = team.filter((m) => m.id !== meId);
  const { startDM, startGroup } = useChat(meId, others.map((m) => m.id));

  const [mode, setMode] = useState<"dm" | "group">("dm");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");

  const reset = () => {
    setMode("dm");
    setSelected(new Set());
    setName("");
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (mode === "dm") {
      next.clear();
      next.add(id);
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    setSelected(next);
  };

  const handleCreate = () => {
    if (selected.size === 0) return;
    if (mode === "dm") {
      const id = startDM(Array.from(selected)[0]);
      reset();
      onClose();
      onCreated(id);
    } else {
      const groupName = name.trim() || `Group with ${selected.size} people`;
      const id = startGroup(Array.from(selected), groupName);
      reset();
      onClose();
      onCreated(id);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              reset();
              onClose();
            }}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-6 max-h-[80vh] flex flex-col"
          >
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <h2 className="font-display text-lg font-semibold tracking-tight mb-4">
              New conversation
            </h2>

            <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-foreground/[0.08] bg-background/40 p-1 self-start">
              <button
                onClick={() => {
                  setMode("dm");
                  setSelected(new Set());
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mode === "dm"
                    ? "bg-accent/60 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3 w-3" />
                Direct message
              </button>
              <button
                onClick={() => {
                  setMode("group");
                  setSelected(new Set());
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  mode === "group"
                    ? "bg-accent/60 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="h-3 w-3" />
                Group chat
              </button>
            </div>

            {mode === "group" && (
              <div className="mb-4">
                <label className="text-xs font-medium">Group name</label>
                <Input
                  placeholder="e.g. Engineering, Design crit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-2">
              {mode === "dm"
                ? "Pick someone to message:"
                : `Add teammates (${selected.size} selected):`}
            </p>

            <ul className="flex-1 overflow-y-auto scrollbar-thin space-y-1 -mx-2 px-2">
              {others.map((m) => {
                const isSelected = selected.has(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors",
                        isSelected
                          ? "bg-emerald-400/10 ring-1 ring-emerald-400/30"
                          : "hover:bg-accent/40"
                      )}
                    >
                      <MemberAvatar member={m} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          @{m.username}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
              {others.length === 0 && (
                <li className="py-8 text-center text-xs text-muted-foreground">
                  No teammates yet. Invite someone first.
                </li>
              )}
            </ul>

            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-foreground/[0.06]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={selected.size === 0}
                onClick={handleCreate}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                {mode === "dm" ? "Start chat" : "Create group"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
