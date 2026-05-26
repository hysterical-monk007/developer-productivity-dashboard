"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { DollyPanel } from "./dolly-panel";
import { cn } from "@/lib/utils";

/**
 * Floating Dolly button (bottom-right). Image-faced, with a soft conic
 * halo + pulse ring + idle bob. Click opens the popup chat panel above it.
 */
export function DollyFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 pointer-events-none">
        <motion.button
          type="button"
          aria-label="Open Dolly, your personal assistant"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.4 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            "pointer-events-auto group relative h-16 w-16 rounded-full overflow-visible",
            "shadow-2xl shadow-pink-500/40",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-400/50"
          )}
        >
          {/* Soft glow halo behind the image */}
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-full opacity-70 blur-md"
            style={{
              background:
                "conic-gradient(from var(--angle, 0deg), #f472b6, #c084fc, #fb7185, #f472b6)",
              animation: "rotate-border 6s linear infinite",
            }}
          />

          {/* The image — slight idle bob */}
          <motion.span
            aria-hidden="true"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src="/dolly-avatar.png"
              alt="Dolly"
              width={128}
              height={128}
              priority
              className="h-full w-full rounded-full object-cover ring-2 ring-pink-400/50"
            />
          </motion.span>

          {/* Online dot */}
          <span className="absolute bottom-0 right-0 inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-background z-10" />

          {/* Hover label */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap rounded-full border border-foreground/[0.08] bg-card/80 backdrop-blur px-3 py-1.5 text-xs font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
            <span className="text-foreground/90">Ask Dolly</span>
            <span className="ml-1 text-pink-400">♡</span>
          </span>
        </motion.button>

        {/* Idle pulse ring */}
        {!open && (
          <motion.span
            aria-hidden="true"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.8, 1.8], opacity: [0.4, 0, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-pink-400/40 pointer-events-none"
          />
        )}
      </div>

      <DollyPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
