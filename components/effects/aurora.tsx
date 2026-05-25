"use client";

import { cn } from "@/lib/utils";

/**
 * AuroraBackground
 *
 * Fixed-position animated gradient mesh — four blurred color blobs that
 * slowly drift around the viewport, blended together with subtle film
 * grain. This is the signature visual identity of the dashboard.
 *
 * Render this once near the root of the dashboard layout (z-index: -1
 * relative to its container). It's `pointer-events: none` so it never
 * blocks input.
 */
export function AuroraBackground({
  className,
  intensity = "default",
}: {
  className?: string;
  intensity?: "default" | "subtle";
}) {
  const blurAmt = intensity === "subtle" ? "blur-[120px]" : "blur-[140px]";
  const opacity = intensity === "subtle" ? "opacity-[0.55]" : "opacity-[0.7]";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden grain",
        className
      )}
    >
      {/* Soft base vignette so the blobs have something to fade into */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_75%)]" />

      {/* Four animated color blobs */}
      <div
        className={cn(
          "absolute top-[5%] left-[10%] h-[55vw] w-[55vw] rounded-full",
          blurAmt,
          opacity,
          "aurora-blob-1"
        )}
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--aurora-1)) 0%, transparent 60%)",
        }}
      />
      <div
        className={cn(
          "absolute top-[20%] right-[5%] h-[50vw] w-[50vw] rounded-full",
          blurAmt,
          opacity,
          "aurora-blob-2"
        )}
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--aurora-2)) 0%, transparent 60%)",
        }}
      />
      <div
        className={cn(
          "absolute bottom-[10%] left-[20%] h-[45vw] w-[45vw] rounded-full",
          blurAmt,
          opacity,
          "aurora-blob-3"
        )}
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--aurora-3)) 0%, transparent 60%)",
        }}
      />
      <div
        className={cn(
          "absolute bottom-[5%] right-[15%] h-[40vw] w-[40vw] rounded-full",
          blurAmt,
          opacity,
          "aurora-blob-4"
        )}
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--aurora-4)) 0%, transparent 60%)",
        }}
      />

      {/* Mask that darkens the bottom 25% so cards in that region stay readable */}
      <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
