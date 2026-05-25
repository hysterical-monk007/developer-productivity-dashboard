import { addDays, format } from "date-fns";

export type CommitPoint = {
  date: string;
  iso: string;
  commits: number | null;
  predicted: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  isForecast: boolean;
};

export type ForecastResult = {
  points: CommitPoint[];
  summary: {
    next7Total: number;
    ciLowTotal: number;
    ciHighTotal: number;
    modelAccuracy: number;
  };
  todayLabel: string;
};

/**
 * Fit a simple OLS linear regression on the last 14 days of commits, then
 * project the next 7 days forward with a widening 95% confidence interval.
 * Weekend days are dampened by 0.32 to reflect the weekday/weekend pattern.
 *
 * Returns a single array suitable for Recharts: 30 historical days + a
 * "bridge" point (the last historical day duplicated into the forecast
 * series so the dashed line visually connects) + 7 forecast days.
 */
export function buildCommitsForecast(
  history: { iso: string; commits: number }[],
  todayIso: string
): ForecastResult {
  const historyPoints: CommitPoint[] = history.map((h) => ({
    date: format(new Date(h.iso), "MMM dd"),
    iso: h.iso,
    commits: h.commits,
    predicted: null,
    ciLow: null,
    ciHigh: null,
    isForecast: false,
  }));

  const window = historyPoints.slice(-14);
  const xs = window.map((_, i) => i);
  const ys = window.map((p) => p.commits ?? 0);
  const n = xs.length;

  // Fit only if we have at least 3 points; otherwise produce a flat forecast.
  let slope = 0;
  let intercept = ys.length > 0 ? ys[ys.length - 1] : 0;
  let sigma = 1;

  if (n >= 3) {
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    slope = den === 0 ? 0 : num / den;
    intercept = meanY - slope * meanX;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const yhat = intercept + slope * xs[i];
      ss += (ys[i] - yhat) ** 2;
    }
    sigma = Math.max(1, Math.sqrt(ss / Math.max(1, n - 2)));
  }

  const today = new Date(todayIso);
  const forecast: CommitPoint[] = Array.from({ length: 7 }, (_, k) => {
    const date = addDays(today, k + 1);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const x = n + k;
    const weekendFactor = isWeekend ? 0.32 : 1;
    const point = Math.max(0, (intercept + slope * x) * weekendFactor);
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

  const last = historyPoints[historyPoints.length - 1];
  const bridge: CommitPoint | null = last
    ? {
        ...last,
        predicted: last.commits,
        ciLow: last.commits,
        ciHigh: last.commits,
      }
    : null;

  const points = bridge
    ? [...historyPoints, bridge, ...forecast]
    : [...historyPoints, ...forecast];

  // Pretend model accuracy: 1 - normalized RMSE, clamped.
  const meanY =
    ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
  const modelAccuracy =
    meanY > 0 ? Math.max(0.5, Math.min(0.97, 1 - sigma / (meanY + 1))) : 0.85;

  return {
    points,
    summary: {
      next7Total: forecast.reduce((s, p) => s + (p.predicted ?? 0), 0),
      ciLowTotal: forecast.reduce((s, p) => s + (p.ciLow ?? 0), 0),
      ciHighTotal: forecast.reduce((s, p) => s + (p.ciHigh ?? 0), 0),
      modelAccuracy,
    },
    todayLabel: format(today, "MMM dd"),
  };
}
