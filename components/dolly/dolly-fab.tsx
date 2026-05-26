"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { DollyPanel } from "./dolly-panel";
import { cn } from "@/lib/utils";

/**
 * Floating Action Button for Dolly. Lives in the bottom-right corner of
 * every dashboard page. Click → opens the chat panel.
 *
 * Visual: gradient ball with slow rotating conic glow, soft bounce on idle.
 */
export function DollyFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 pointer-events-none">
        <motion.button
          type="button"
          aria-label="Open Dolly, your personal assistant"
          onClick={() => setOpen(true)}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.4 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            "pointer-events-auto group relative h-14 w-14 rounded-full",
            "shadow-2xl shadow-emerald-500/40",
            "ring-2 ring-emerald-400/40",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60"
          )}
        >
          {/* Conic gradient halo — slowly rotates */}
          <span
            aria-hidden="true"
            className="absolute -inset-1 rounded-full opacity-60 blur-md"
            style={{
              background:
                "conic-gradient(from var(--angle, 0deg), hsl(var(--chart-1)), hsl(var(--chart-2)), hsl(var(--chart-4)), hsl(var(--chart-1)))",
              animation: "rotate-border 6s linear infinite",
            }}
          />
          {/* Bouncing core */}
          <motion.span
            aria-hidden="true"
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-rose-400"
          />
          {/* Inner gloss */}
          <span
            aria-hidden="true"
            className="absolute inset-1 rounded-full bg-gradient-to-br from-white/40 via-transparent to-transparent"
          />
          {/* Icon */}
          <span className="relative flex h-full w-full items-center justify-center">
            <Sparkles className="h-6 w-6 text-emerald-950" strokeWidth={2.5} />
          </span>

          {/* "Hi I'm Dolly" hover label */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap rounded-full border border-foreground/[0.08] bg-card/80 backdrop-blur px-3 py-1.5 text-xs font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
            <span className="text-foreground/90">Ask Dolly</span>
            <span className="ml-1 text-muted-foreground">✨</span>
          </span>
        </motion.button>

        {/* Idle pulse ring */}
        <motion.span
          aria-hidden="true"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.8, 1.8],
            opacity: [0.5, 0, 0],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute inset-0 rounded-full border-2 border-emerald-400/40 pointer-events-none"
        />
      </div>

      <DollyPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
