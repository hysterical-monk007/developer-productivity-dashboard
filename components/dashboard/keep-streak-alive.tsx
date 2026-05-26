"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flame, Github, Clock, Trophy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";

type Repo = {
  name: string;
  url?: string;
  lastPush?: string;
};

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function KeepStreakAlive({
  open,
  onClose,
  currentStreak,
  longestStreak,
}: {
  open: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
}) {
  const { linked, profile } = useGithub();
  const [tick, setTick] = useState(0);
  const [recentRepo, setRecentRepo] = useState<Repo | null>(null);

  // Live countdown to midnight
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  // Find the user's most recently pushed repo so the CTA can deep-link to it.
  useEffect(() => {
    if (!open || !linked) return;
    let cancelled = false;
    fetch("/api/github/repos", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { repos: { name: string; url?: string; lastPush?: string }[] }) => {
        if (cancelled || !Array.isArray(json.repos)) return;
        setRecentRepo(json.repos[0] ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, linked]);

  const remaining = msUntilMidnight();
  const hoursLeft = remaining / 3600000;
  const urgent = hoursLeft < 6;

  const newRepoUrl = profile?.login
    ? `https://github.com/new`
    : "https://github.com/new";

  const recentRepoUrl =
    recentRepo?.url ??
    (profile?.login && recentRepo
      ? `https://github.com/${profile.login}/${recentRepo.name}`
      : null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-6 overflow-hidden"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-lg shadow-rose-500/40">
                  <Flame className="h-6 w-6 text-rose-950" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight">
                    Keep your streak alive
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    A single commit before midnight resets the counter and
                    extends the run.
                  </p>
                </div>
              </div>

              {/* Stat strip */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Flame className="h-2.5 w-2.5 text-rose-300" />
                    Current
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {currentStreak}{" "}
                    <span className="text-sm font-sans text-muted-foreground">
                      day{currentStreak === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Trophy className="h-2.5 w-2.5 text-amber-300" />
                    All-time best
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {longestStreak}{" "}
                    <span className="text-sm font-sans text-muted-foreground">
                      day{longestStreak === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Countdown */}
              <div
                className={`rounded-xl border p-3 mb-4 ${
                  urgent
                    ? "border-rose-500/40 bg-rose-500/[0.08]"
                    : "border-foreground/[0.08] bg-background/30"
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${
                    urgent ? "text-rose-300" : "text-muted-foreground"
                  }`}
                >
                  <Clock className="h-2.5 w-2.5" />
                  Time until streak resets
                </p>
                <p
                  className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
                    urgent ? "text-rose-300" : ""
                  }`}
                >
                  {formatCountdown(remaining)}
                </p>
                {urgent && (
                  <p className="mt-1 text-[11px] text-rose-300">
                    Less than 6 hours left.
                  </p>
                )}
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Quick ways to land a commit right now:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {recentRepoUrl && (
                    <a
                      href={recentRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-foreground/[0.08] bg-background/30 p-3 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 ring-1 ring-emerald-400/30">
                        <Github className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          Open{" "}
                          <span className="font-mono">{recentRepo?.name}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Your most recent repo · push any change
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    </a>
                  )}

                  <a
                    href={newRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-foreground/[0.08] bg-background/30 p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400/15 ring-1 ring-rose-400/30">
                      <Github className="h-4 w-4 text-rose-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        Spin up a new repo
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Initial commit counts
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                  </a>
                </div>
              </div>

              {/* Footer */}
              <p className="mt-4 text-[10px] text-muted-foreground text-center">
                Tip: even a README typo fix counts as a contribution if it lands
                on the repo&apos;s default branch.
              </p>

              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Maybe later
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Re-export the tick so the countdown rerenders. The component owns the
// state; nothing else needs this — but exporting the helper keeps it
// available for testing.
export { msUntilMidnight, formatCountdown };
