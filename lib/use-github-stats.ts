"use client";

import { useEffect, useState } from "react";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";
import { metrics as mockMetrics, type Metric } from "@/mock/metrics";

export type GithubStats = {
  commits: number;
  prsOpen: number;
  prsMerged: number;
  issuesOpen: number;
  streak: number;
  longestStreak?: number;
  activeRepos: number;
  contributionsByWindow?: {
    today: number;
    last7d: number;
    last30d: number;
    lastYear: number;
  };
  mostActiveDay?: string;
  deltas: {
    commits: number;
    prs: number;
    issues: number;
    streak: number;
    repos: number;
  };
};

export type CommitWindow = "today" | "last7d" | "last30d" | "lastYear";

export const COMMIT_WINDOW_LABEL: Record<CommitWindow, string> = {
  today: "today",
  last7d: "last 7 days",
  last30d: "last 30 days",
  lastYear: "last year",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  if (n >= 1_000) return n.toLocaleString();
  return n.toString();
}

function overlayMetrics(stats: GithubStats): Metric[] {
  const base = mockMetrics;
  // Build a map by key so the order from mockMetrics is preserved.
  const byKey = Object.fromEntries(base.map((m) => [m.key, m]));

  byKey.commits = {
    ...byKey.commits,
    value: formatNumber(stats.commits),
    sub: "last year",
    delta: stats.deltas.commits,
    trend: stats.deltas.commits > 0 ? "up" : stats.deltas.commits < 0 ? "down" : "flat",
    // Anomalies only really make sense with historical baselines — drop for live
    anomaly: undefined,
  };
  byKey.prs = {
    ...byKey.prs,
    value: formatNumber(stats.prsOpen),
    sub: `open · ${formatNumber(stats.prsMerged)} merged`,
    delta: stats.deltas.prs,
    trend: stats.deltas.prs > 0 ? "up" : stats.deltas.prs < 0 ? "down" : "flat",
  };
  byKey.issues = {
    ...byKey.issues,
    value: formatNumber(stats.issuesOpen),
    sub: "open",
    delta: stats.deltas.issues,
    trend: stats.deltas.issues > 0 ? "up" : stats.deltas.issues < 0 ? "down" : "flat",
    anomaly: undefined,
  };
  byKey.streak = {
    ...byKey.streak,
    value: stats.streak.toString(),
    sub: stats.streak === 1 ? "day" : "days",
    delta: stats.deltas.streak,
    trend: stats.deltas.streak > 0 ? "up" : "flat",
    anomaly: undefined,
  };
  byKey.repos = {
    ...byKey.repos,
    value: formatNumber(stats.activeRepos),
    sub: "public",
    delta: stats.deltas.repos,
    trend: "flat",
  };

  return base.map((m) => byKey[m.key]);
}

export function useGithubStats(): {
  metrics: Metric[];
  stats: GithubStats | null;
  source: "mock" | "live";
  loading: boolean;
} {
  const { linked } = useGithub();
  const [stats, setStats] = useState<GithubStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!linked) {
      setStats(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/github/stats", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: GithubStats) => {
        if (cancelled) return;
        setStats(json);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  if (stats) {
    return {
      metrics: overlayMetrics(stats),
      stats,
      source: "live",
      loading: false,
    };
  }
  return { metrics: mockMetrics, stats: null, source: "mock", loading };
}
