"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, RotateCcw, Square, Bot, Sparkles, Minus } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollyAvatar } from "./dolly-avatar";
import { useDolly, type DollyMessage } from "@/lib/dolly/use-dolly";
import { cn } from "@/lib/utils";

/**
 * Dolly chat panel — styled like a default web chatbot (Intercom / Crisp /
 * Drift). Floating popup window anchored bottom-right above the FAB, NOT
 * a full-height side drawer.
 */
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
        <motion.aside
          // Anchor: bottom-right, sitting just above the FAB. Mobile takes
          // the bottom half of the screen; desktop is a fixed-size box.
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden",
            // Position: bottom-right of viewport, above the FAB
            "bottom-28 right-6",
            // Size: small popup
            "w-[min(380px,calc(100vw-3rem))] h-[min(620px,calc(100vh-9rem))]",
            // Style: rounded glass card
            "rounded-2xl border border-pink-400/20",
            "shadow-2xl shadow-pink-500/20",
            "bg-card/95 backdrop-blur-2xl"
          )}
          role="dialog"
          aria-label="Dolly chat"
        >
          {/* HEADER — chatbot style banner with avatar + name */}
          <header className="relative shrink-0 px-4 py-3 border-b border-foreground/[0.08] overflow-hidden">
            {/* Soft pink gradient backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/[0.12] via-fuchsia-500/[0.06] to-violet-500/[0.10]" />
            <div className="relative flex items-center gap-3">
              <DollyAvatar size={40} halo online />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-semibold tracking-tight flex items-center gap-1.5">
                  Dolly
                  <span className="text-pink-400" aria-hidden="true">
                    ♡
                  </span>
                </h2>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Online · reading your live data
                </p>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clear}
                  aria-label="Clear conversation"
                  title="Clear"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Minimize"
                title="Minimize"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* MESSAGES area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full px-3 py-3">
              {messages.length === 0 ? (
                <DollyIntro
                  suggestions={suggestions}
                  onPick={(s) => handleSend(s)}
                />
              ) : (
                <ol className="space-y-3">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {streaming && (
                    <li className="flex items-center gap-2 text-[11px] text-muted-foreground pl-9">
                      <span className="flex gap-0.5">
                        <span
                          className="h-1 w-1 rounded-full bg-pink-400 animate-pulse"
                          style={{ animationDelay: "0s" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-pink-400 animate-pulse"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <span
                          className="h-1 w-1 rounded-full bg-pink-400 animate-pulse"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </span>
                      Dolly is typing…
                    </li>
                  )}
                  <div ref={messagesEndRef} />
                </ol>
              )}
            </ScrollArea>
          </div>

          {/* COMPOSER */}
          <div className="shrink-0 border-t border-foreground/[0.08] p-2.5 bg-background/40">
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
                placeholder="Ask Dolly anything…"
                disabled={streaming}
                className="flex-1 bg-background/60 border-foreground/[0.08] rounded-full h-9 px-3.5 text-sm focus-visible:ring-pink-400/40"
              />
              {streaming ? (
                <Button
                  size="icon"
                  onClick={stop}
                  variant="outline"
                  className="h-9 w-9 rounded-full border-rose-400/40 text-rose-300 hover:bg-rose-500/10"
                  aria-label="Stop"
                >
                  <Square className="h-3.5 w-3.5" fill="currentColor" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={() => handleSend()}
                  disabled={!draft.trim()}
                  className={cn(
                    "h-9 w-9 rounded-full",
                    "bg-gradient-to-br from-pink-400 via-pink-500 to-fuchsia-500",
                    "text-white shadow-md shadow-pink-500/30 hover:opacity-90"
                  )}
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-[9px] text-muted-foreground text-center px-2">
              Dolly only sees what&apos;s on your dashboard. Nothing else
              leaves your browser.
            </p>
          </div>
        </motion.aside>
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
      className="flex flex-col items-center text-center pt-4 pb-2"
    >
      {/* Big avatar card with the photo as a banner */}
      <div className="relative w-full mb-4 overflow-hidden rounded-2xl">
        <Image
          src="/dolly-avatar.png"
          alt="Dolly"
          width={500}
          height={500}
          priority
          className="w-full h-32 object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/20 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground drop-shadow">
            Hi, I&apos;m Dolly ♡
          </h3>
          <p className="text-[10px] text-foreground/90 drop-shadow">
            Your personal coding companion
          </p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-2 leading-relaxed">
        I can see your live GitHub stats, ML signals, team state, recent
        activity, and every repo you work on. Ask me anything specific.
      </p>

      <div className="mt-4 w-full space-y-1.5">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 text-left px-1">
          Try one of these
        </p>
        {suggestions.slice(0, 4).map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 + i * 0.04 }}
            onClick={() => onPick(s)}
            className="group w-full text-left rounded-xl border border-foreground/[0.08] bg-background/40 px-3 py-2 text-[12px] hover:bg-pink-500/[0.06] hover:border-pink-400/30 transition-colors flex items-center gap-2"
          >
            <Sparkles className="h-3 w-3 text-pink-400 shrink-0 transition-transform group-hover:scale-110" />
            <span className="text-foreground/90 leading-tight">{s}</span>
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-2 items-start", !isDolly && "flex-row-reverse")}
    >
      {isDolly && <DollyAvatar size={28} />}
      <div
        className={cn(
          "min-w-0 max-w-[78%]",
          !isDolly && "flex flex-col items-end"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-3 py-1.5 text-[13px] leading-relaxed whitespace-pre-wrap",
            isDolly
              ? "bg-accent/50 text-foreground rounded-tl-sm"
              : "bg-gradient-to-br from-pink-400 to-fuchsia-500 text-white rounded-tr-sm shadow-sm shadow-pink-500/30"
          )}
        >
          {msg.text || (isDolly ? "…" : "")}
        </div>
        {isDolly && msg.source && (
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
              msg.source === "ai" &&
                "border-pink-400/30 bg-pink-400/10 text-pink-300",
              msg.source === "ollama" &&
                "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
              msg.source === "local" &&
                "border-foreground/15 bg-background/40 text-muted-foreground"
            )}
          >
            <Bot className="h-2.5 w-2.5" />
            {msg.source === "ai" && "Claude · streaming"}
            {msg.source === "ollama" &&
              `Ollama · ${msg.sourceMeta?.model ?? "local"}`}
            {msg.source === "local" && (
              <>
                Local responder
                {msg.sourceMeta?.fallbackFrom && (
                  <span className="opacity-70">
                    · {msg.sourceMeta.fallbackFrom} unavailable
                  </span>
                )}
              </>
            )}
          </span>
        )}
      </div>
    </motion.li>
  );
}
