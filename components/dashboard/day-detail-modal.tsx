"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  GitCommit,
  Calendar,
  ExternalLink,
  Loader2,
  Github,
  CircleSlash,
} from "lucide-react";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";

type Commit = {
  sha: string;
  message: string;
  repo: string;
  repoFullName: string;
  time: string;
  url: string;
};

type DayData = {
  date: string;
  totalCommits: number;
  commits: Commit[];
  reposSummary: { name: string; count: number }[];
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DayDetailModal({
  open,
  onClose,
  iso,
  contributionCount,
}: {
  open: boolean;
  onClose: () => void;
  iso: string | null;
  contributionCount: number;
}) {
  const { linked } = useGithub();
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !iso) return;
    if (!linked) {
      // Not linked — just show the count from the cell, don't try to fetch
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/github/day-commits?date=${encodeURIComponent(iso)}`, {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.message ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json: DayData) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch commits"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, iso, linked]);

  const totalCommits = data?.totalCommits ?? 0;
  const otherContributions = Math.max(0, contributionCount - totalCommits);

  return (
    <AnimatePresence>
      {open && iso && (
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
            className="glass-strong relative z-10 w-full max-w-lg rounded-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <header className="relative mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-400/30">
                  <Calendar className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    {prettyDate(iso)}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {contributionCount} contribution
                    {contributionCount === 1 ? "" : "s"} on this day
                  </p>
                </div>
              </div>
            </header>

            <div className="relative flex-1 min-h-0 overflow-y-auto scrollbar-thin -mx-1 px-1">
              {!linked && (
                <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-4 text-center">
                  <CircleSlash className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    Connect GitHub to see commit details
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Without a linked account I can only show the count.
                  </p>
                </div>
              )}

              {linked && loading && (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching commits for this day…
                </div>
              )}

              {linked && error && (
                <div className="rounded-xl border border-rose-400/30 bg-rose-400/[0.06] p-3 text-xs text-rose-300">
                  Couldn&apos;t load commits: {error}
                </div>
              )}

              {linked && !loading && !error && data && (
                <>
                  {/* Summary strip */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <GitCommit className="h-2.5 w-2.5 text-emerald-300" />
                        Commits
                      </p>
                      <p className="mt-1 font-display text-xl font-semibold tabular-nums">
                        {totalCommits}
                      </p>
                    </div>
                    <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Other activity
                      </p>
                      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-muted-foreground">
                        {otherContributions}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        PRs, issues, reviews
                      </p>
                    </div>
                  </div>

                  {/* Repo split */}
                  {data.reposSummary.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                        By repo
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {data.reposSummary.map((r) => (
                          <span
                            key={r.name}
                            className="inline-flex items-center gap-1 rounded-md border border-foreground/[0.08] bg-background/40 px-2 py-0.5 text-[10px] font-mono"
                          >
                            <span className="text-foreground/80">{r.name}</span>
                            <span className="text-emerald-300 tabular-nums">
                              {r.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commit list */}
                  {data.commits.length === 0 ? (
                    <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-4 text-center text-xs text-muted-foreground">
                      No commits authored by you on this day — the{" "}
                      {contributionCount} contribution
                      {contributionCount === 1 ? "" : "s"} might be PRs,
                      issues, or reviews instead.
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                        Commits
                      </p>
                      <ul className="space-y-1.5">
                        {data.commits.map((c) => (
                          <li key={c.sha}>
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-2.5 rounded-lg border border-foreground/[0.08] bg-background/30 p-2.5 hover:bg-accent/40 transition-colors"
                            >
                              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-400/15 ring-1 ring-emerald-400/30">
                                <GitCommit className="h-3 w-3 text-emerald-300" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-foreground/90 truncate">
                                  {c.message}
                                </span>
                                <span className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span className="font-mono">{c.repo}</span>
                                  <span className="font-mono text-muted-foreground/60">
                                    {c.sha}
                                  </span>
                                  <span>·</span>
                                  <span>{relativeTime(c.time)}</span>
                                </span>
                              </span>
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground mt-1" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>

            <footer className="mt-4 pt-3 border-t border-foreground/[0.06] flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Github className="h-3 w-3" />
                Live GitHub data
              </span>
              <button
                onClick={onClose}
                className="rounded-md px-2 py-1 hover:bg-accent/40 transition-colors"
              >
                Close
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
