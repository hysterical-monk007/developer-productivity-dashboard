import { sparklines } from "./timeseries";

export type Anomaly = {
  sigma: number; // signed; positive = above baseline
  baseline: string; // human-readable baseline window
  kind: "spike" | "dip" | "drift";
};

export type Metric = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  delta: number; // signed %
  trend: "up" | "down" | "flat";
  good: "up" | "down"; // which direction is "good"
  sparkline: { i: number; v: number }[];
  accent: string; // tailwind gradient classes for the glow + icon bg
  iconColor: string; // tailwind text-* class for the icon
  sparkColor: string; // hex for the recharts stroke/gradient
  icon: "gitcommit" | "gitpr" | "alertcircle" | "flame" | "folder";
  anomaly?: Anomaly;
};

export const metrics: Metric[] = [
  {
    key: "commits",
    label: "Total Commits",
    value: "1,284",
    sub: "this month",
    delta: 12,
    trend: "up",
    good: "up",
    sparkline: sparklines.commits,
    accent: "from-violet-500/25 to-fuchsia-500/10",
    iconColor: "text-violet-400",
    sparkColor: "#a78bfa",
    icon: "gitcommit",
    anomaly: {
      sigma: 2.3,
      baseline: "12-week rolling mean",
      kind: "spike",
    },
  },
  {
    key: "prs",
    label: "Pull Requests",
    value: "47",
    sub: "open · 312 merged",
    delta: 8,
    trend: "up",
    good: "up",
    sparkline: sparklines.prs,
    accent: "from-sky-500/25 to-blue-500/10",
    iconColor: "text-sky-400",
    sparkColor: "#38bdf8",
    icon: "gitpr",
  },
  {
    key: "issues",
    label: "Open Issues",
    value: "23",
    sub: "−5 vs last week",
    delta: -18,
    trend: "down",
    good: "down",
    sparkline: sparklines.issues,
    accent: "from-amber-500/25 to-orange-500/10",
    iconColor: "text-amber-400",
    sparkColor: "#fbbf24",
    icon: "alertcircle",
    anomaly: {
      sigma: -1.8,
      baseline: "8-week rolling mean",
      kind: "dip",
    },
  },
  {
    key: "streak",
    label: "Coding Streak",
    value: "18",
    sub: "days in a row",
    delta: 28,
    trend: "up",
    good: "up",
    sparkline: sparklines.streak,
    accent: "from-rose-500/25 to-pink-500/10",
    iconColor: "text-rose-400",
    sparkColor: "#fb7185",
    icon: "flame",
    anomaly: {
      sigma: 2.7,
      baseline: "personal historical mean",
      kind: "spike",
    },
  },
  {
    key: "repos",
    label: "Active Repos",
    value: "12",
    sub: "this quarter",
    delta: 0,
    trend: "flat",
    good: "up",
    sparkline: sparklines.repos,
    accent: "from-emerald-500/25 to-teal-500/10",
    iconColor: "text-emerald-400",
    sparkColor: "#34d399",
    icon: "folder",
  },
];
