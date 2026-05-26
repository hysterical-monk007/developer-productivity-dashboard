"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, RotateCcw, Square, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDolly, type DollyMessage } from "@/lib/dolly/use-dolly";
import { cn } from "@/lib/utils";

export function DollyPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { messages, streaming, ask, stop, clear, suggestions } = useDolly();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    ask(t);
    setDraft("");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Close Dolly"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="glass-strong fixed right-0 top-0 z-50 flex h-full w-full sm:w-[460px] lg:w-[540px] flex-col"
          >
            {/* Header */}
            <header className="relative border-b border-foreground/[0.08] px-5 py-4">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.06] via-cyan-500/[0.04] to-rose-500/[0.06] pointer-events-none" />
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -inset-1 rounded-full opacity-60 blur-sm"
                    style={{
                      background:
                        "conic-gradient(from var(--angle, 0deg), hsl(var(--chart-1)), hsl(var(--chart-2)), hsl(var(--chart-4)), hsl(var(--chart-1)))",
                      animation: "rotate-border 6s linear infinite",
                    }}
                  />
                  <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-rose-400 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                    <Sparkles className="h-5 w-5 text-emerald-950" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    Dolly
                  </h2>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Your personal assistant · reads your live data
                  </p>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clear}
                    aria-label="Clear conversation"
                    title="Clear conversation"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            {/* Messages or intro */}
            <ScrollArea className="flex-1 px-4 py-4">
              {messages.length === 0 ? (
                <DollyIntro
                  suggestions={suggestions}
                  onPick={(s) => handleSend(s)}
                />
              ) : (
                <ol className="space-y-4">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {streaming && (
                    <li className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex gap-0.5">
                        <span
                          className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"
                          style={{ animationDelay: "0s" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </span>
                      Dolly is thinking…
                    </li>
                  )}
                  <div ref={messagesEndRef} />
                </ol>
              )}
            </ScrollArea>

            {/* Composer */}
            <div className="border-t border-foreground/[0.08] p-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Dolly anything about your activity…"
                  disabled={streaming}
                  className="flex-1 bg-background/40"
                />
                {streaming ? (
                  <Button
                    size="icon"
                    onClick={stop}
                    variant="outline"
                    className="h-9 w-9 border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                    aria-label="Stop"
                  >
                    <Square className="h-3.5 w-3.5" fill="currentColor" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={!draft.trim()}
                    className="h-9 w-9 bg-gradient-to-br from-emerald-400 to-emerald-500 text-emerald-950 hover:opacity-90"
                    aria-label="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground text-center">
                Dolly only sees what&apos;s on your dashboard — your own
                stats, ML signals, and team list. Nothing else leaves your
                browser.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DollyIntro({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (s: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center pt-6 pb-2"
    >
      <div className="relative mb-4">
        <span
          aria-hidden="true"
          className="absolute -inset-3 rounded-full opacity-50 blur-md"
          style={{
            background:
              "conic-gradient(from var(--angle, 0deg), hsl(var(--chart-1)), hsl(var(--chart-2)), hsl(var(--chart-4)), hsl(var(--chart-1)))",
            animation: "rotate-border 8s linear infinite",
          }}
        />
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-rose-400 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
          <Sparkles className="h-8 w-8 text-emerald-950" strokeWidth={2.5} />
        </div>
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight">
        Hey, I&apos;m Dolly.
      </h3>
      <p className="mt-1 max-w-[280px] text-xs text-muted-foreground">
        Your personal assistant. I&apos;ve got your live GitHub stats, ML
        signals, team state, and recent activity in front of me. Ask me
        anything specific.
      </p>

      <div className="mt-6 w-full space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 text-left">
          Try one of these:
        </p>
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            onClick={() => onPick(s)}
            className="group w-full text-left rounded-xl border border-foreground/[0.08] bg-background/30 p-3 text-sm hover:bg-accent/40 transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-3 w-3 text-emerald-300 shrink-0 transition-transform group-hover:scale-110" />
            <span className="text-foreground/90">{s}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function MessageBubble({ msg }: { msg: DollyMessage }) {
  const isDolly = msg.role === "assistant";
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex gap-2 items-start", !isDolly && "flex-row-reverse")}
    >
      {isDolly && (
        <div className="relative shrink-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-rose-400 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <Sparkles className="h-3.5 w-3.5 text-emerald-950" strokeWidth={2.5} />
          </div>
        </div>
      )}
      <div className={cn("min-w-0 max-w-[88%]", !isDolly && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
            isDolly
              ? "bg-accent/40 text-foreground rounded-tl-sm"
              : "bg-gradient-to-br from-emerald-400 to-emerald-500 text-emerald-950 rounded-tr-sm"
          )}
        >
          {msg.text || (isDolly ? "…" : "")}
        </div>
        {isDolly && msg.source && (
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
              msg.source === "ai"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-foreground/15 bg-background/40 text-muted-foreground"
            )}
          >
            <Bot className="h-2.5 w-2.5" />
            {msg.source === "ai" ? "Claude · streaming" : "Local responder"}
          </span>
        )}
      </div>
    </motion.li>
  );
}
