"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowUpRight, Zap, GitCommit } from "lucide-react";
import { currentUser } from "@/mock/user";
import { useGithub } from "@/lib/use-github";
import { useGithubStats } from "@/lib/use-github-stats";

function greeting(hour: number): string {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Burning oil";
}

export function Hero() {
  const { linked, profile } = useGithub();
  const { metrics, source } = useGithubStats();

  const displayName =
    linked && profile
      ? profile.name?.split(" ")[0]?.trim() || profile.login
      : currentUser.name.split(" ")[0];

  const now = new Date();
  const dateText = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Pick a hero stat — total commits is the canonical "are you shipping?" number
  const commitsMetric = metrics.find((m) => m.key === "commits");
  const streakMetric = metrics.find((m) => m.key === "streak");

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col gap-6"
      >
        {/* Date + status row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{dateText}</span>
          <span className="text-muted-foreground/40">·</span>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-medium text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {source === "live" ? "Live · GitHub" : "Demo data"}
          </div>
        </div>

        {/* The big editorial headline */}
        <div className="space-y-2">
          <h1 className="font-display text-[44px] sm:text-[56px] lg:text-[72px] leading-[0.95] font-semibold tracking-tight">
            <span className="text-foreground">{greeting(now.getHours())},</span>{" "}
            <span className="bg-gradient-to-br from-emerald-400 via-emerald-300 to-coral-300 bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--chart-1)) 0%, hsl(var(--chart-4)) 40%, hsl(var(--chart-2)) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {displayName}.
            </span>
          </h1>
          <p className="max-w-2xl text-sm sm:text-base text-muted-foreground">
            Here&apos;s how your week is shaping up across every repo, every PR,
            every reviewer. Pulse is reading {source === "live" ? "your real GitHub activity" : "your demo dataset"} and the AI has noticed
            a few things worth your attention.
          </p>
        </div>

        {/* Hero stat strip — two large highlight values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass rounded-2xl p-4 col-span-2 relative overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <GitCommit className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Total commits {source === "live" ? "(last year)" : "(this month)"}
                </p>
                <p className="font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums leading-none mt-1">
                  {commitsMetric?.value ?? "—"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  AI says: forecast keeps trending up · 91% R²
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass rounded-2xl p-4 relative overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-500/15 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 ring-1 ring-rose-500/30">
                <Zap className="h-5 w-5 text-rose-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Coding streak
                </p>
                <p className="font-display text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums leading-none mt-1">
                  {streakMetric?.value ?? "0"}{" "}
                  <span className="text-sm font-sans text-muted-foreground">days</span>
                </p>
                <button className="mt-2 inline-flex items-center gap-1 text-xs text-rose-300/80 hover:text-rose-200 transition-colors">
                  Keep it alive
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
