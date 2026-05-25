import { sparklines } from "./timeseries";

export type Anomaly = {
  sigma: number;
  baseline: string;
  kind: "spike" | "dip" | "drift";
};

export type Metric = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  delta: number;
  trend: "up" | "down" | "flat";
  good: "up" | "down";
  sparkline: { i: number; v: number }[];
  accent: string;       // gradient classes for the icon backdrop + glow
  iconColor: string;    // text-* for the icon
  sparkColor: string;   // hex for Recharts stroke + gradient
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
    accent: "from-emerald-500/25 to-teal-500/10",
    iconColor: "text-emerald-300",
    sparkColor: "#34d399",
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
    accent: "from-rose-500/25 to-coral-500/10",
    iconColor: "text-rose-300",
    sparkColor: "#fb7185",
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
    iconColor: "text-amber-300",
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
    accent: "from-cyan-500/25 to-teal-500/10",
    iconColor: "text-cyan-300",
    sparkColor: "#22d3ee",
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
    accent: "from-lime-500/25 to-emerald-500/10",
    iconColor: "text-lime-300",
    sparkColor: "#a3e635",
    icon: "folder",
  },
];
