import { subDays, addDays, format } from "date-fns";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seededRandom(42);

export type CommitPoint = {
  date: string;
  iso: string;
  commits: number | null;
  predicted: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  isForecast: boolean;
};

const TODAY = new Date("2026-05-25");

// Commits over 30 days — realistic curve: weekdays > weekends, slight upward trend
const history: CommitPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = subDays(TODAY, 29 - i);
  const dow = date.getDay();
  const isWeekend = dow === 0 || dow === 6;
  const base = isWeekend ? 4 : 18;
  const trend = i * 0.25;
  const noise = (rand() - 0.5) * 10;
  const value = Math.max(0, Math.round(base + trend + noise));
  return {
    date: format(date, "MMM dd"),
    iso: format(date, "yyyy-MM-dd"),
    commits: value,
    predicted: null,
    ciLow: null,
    ciHigh: null,
    isForecast: false,
  };
});

// Simple "model": fit a linear regression on the last 14 days, then project
// the next 7 days with a widening confidence interval.
function fitAndForecast(): CommitPoint[] {
  const window = history.slice(-14);
  const xs = window.map((_, i) => i);
  const ys = window.map((p) => p.commits ?? 0);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  // Residual standard deviation
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const yhat = intercept + slope * xs[i];
    ss += (ys[i] - yhat) ** 2;
  }
  const sigma = Math.sqrt(ss / Math.max(1, n - 2));

  // Project 7 days forward, with weekend dampening
  return Array.from({ length: 7 }, (_, k) => {
    const date = addDays(TODAY, k + 1);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const x = n + k;
    const weekendFactor = isWeekend ? 0.32 : 1;
    const point = Math.max(0, (intercept + slope * x) * weekendFactor);
    // CI widens with horizon: ±(1.96 * sigma * sqrt(1 + k/7))
    const halfWidth = 1.96 * sigma * Math.sqrt(1 + k / 7) * weekendFactor;
    return {
      date: format(date, "MMM dd"),
      iso: format(date, "yyyy-MM-dd"),
      commits: null,
      predicted: Math.round(point),
      ciLow: Math.max(0, Math.round(point - halfWidth)),
      ciHigh: Math.round(point + halfWidth),
      isForecast: true,
    };
  });
}

const forecast = fitAndForecast();

// Bridge point: duplicate the last historical day into the forecast series so
// the dashed line visually connects to the solid line.
const bridge: CommitPoint = {
  ...history[history.length - 1],
  predicted: history[history.length - 1].commits,
  ciLow: history[history.length - 1].commits,
  ciHigh: history[history.length - 1].commits,
};

export const commitsLast30Days: CommitPoint[] = [
  ...history,
  bridge,
  ...forecast,
];

export const forecastSummary = {
  next7Total: forecast.reduce((s, p) => s + (p.predicted ?? 0), 0),
  ciLowTotal: forecast.reduce((s, p) => s + (p.ciLow ?? 0), 0),
  ciHighTotal: forecast.reduce((s, p) => s + (p.ciHigh ?? 0), 0),
  modelAccuracy: 0.91, // pretend 91% R² from backtest
};

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
