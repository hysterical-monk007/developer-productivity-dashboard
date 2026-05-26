import { subDays, format } from "date-fns";
import { buildCommitsForecast, type CommitPoint } from "@/lib/ml/forecast";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);

const TODAY = new Date("2026-05-25");
const TODAY_ISO = format(TODAY, "yyyy-MM-dd");

// 30 days of realistic-looking commit history (seeded, deterministic).
const history = Array.from({ length: 30 }, (_, i) => {
  const date = subDays(TODAY, 29 - i);
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const base = isWeekend ? 4 : 18;
  const trend = i * 0.25;
  const noise = (rand() - 0.5) * 10;
  const value = Math.max(0, Math.round(base + trend + noise));
  return {
    iso: format(date, "yyyy-MM-dd"),
    commits: value,
  };
});

// Run the real Holt-Winters forecaster on the mock history at module load.
const mockForecast = buildCommitsForecast(
  history.map((h) => ({ iso: h.iso, commits: h.commits })),
  TODAY_ISO
);

export type { CommitPoint };
export const commitsLast30Days: CommitPoint[] = mockForecast.points;
export const forecastSummary = mockForecast.summary;
export const mockForecastModel = mockForecast.model;

// PR vs Issue activity, 12 weeks
export const prIssueWeekly = Array.from({ length: 12 }, (_, i) => {
  const weekStart = subDays(TODAY, (11 - i) * 7);
  return {
    week: `W${i + 1}`,
    date: format(weekStart, "MMM dd"),
    prs: Math.round(18 + rand() * 16 + (i > 8 ? 6 : 0)),
    issues: Math.round(10 + rand() * 14 + (i < 4 ? 4 : 0)),
    reviews: Math.round(15 + rand() * 18),
  };
});

// Language breakdown for donut
export const languageBreakdown = [
  { name: "TypeScript", value: 42, color: "#3178c6" },
  { name: "Go", value: 24, color: "#00ADD8" },
  { name: "Swift", value: 12, color: "#F05138" },
  { name: "Python", value: 11, color: "#FFD43B" },
  { name: "HCL", value: 6, color: "#844FBA" },
  { name: "Other", value: 5, color: "#94a3b8" },
];

// Sparkline data for metric cards (7 points each)
export const sparklines = {
  commits: [12, 18, 14, 22, 19, 26, 31].map((v, i) => ({ i, v })),
  prs: [4, 6, 5, 8, 7, 9, 11].map((v, i) => ({ i, v })),
  issues: [28, 26, 27, 25, 23, 24, 23].map((v, i) => ({ i, v })),
  streak: [10, 11, 12, 13, 14, 17, 18].map((v, i) => ({ i, v })),
  repos: [10, 10, 11, 11, 12, 12, 12].map((v, i) => ({ i, v })),
};
