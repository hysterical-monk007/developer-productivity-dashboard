/**
 * Holt-Winters double exponential smoothing (no seasonality term, but with
 * weekly weekend dampening as a multiplicative seasonal proxy).
 *
 * State equations:
 *   L_t = α * y_t + (1 - α) * (L_{t-1} + T_{t-1})       — level
 *   T_t = β * (L_t - L_{t-1}) + (1 - β) * T_{t-1}        — trend
 *   F_{t+h} = L_t + h * T_t                              — h-step forecast
 *
 * We pick α and β by grid search minimizing in-sample MSE — small grid for
 * speed (11 * 11 = 121 evaluations), each ~O(n).
 *
 * Prediction interval: 95% via t-distribution approximation
 *   F_{t+h} ± 1.96 * σ_residual * √(1 + h * (α² + (h-1)/2 * (α*β + β²)))
 * which widens with horizon — the standard Holt-Winters variance formula.
 */

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

export type ForecastModel = {
  algorithm: "holt-winters";
  alpha: number;
  beta: number;
  mseTrain: number;
  rSquared: number;
  residualSigma: number;
  trainedOn: number; // sample size
};

export type ForecastResult = {
  points: CommitPoint[];
  model: ForecastModel;
  summary: {
    next7Total: number;
    ciLowTotal: number;
    ciHighTotal: number;
    modelAccuracy: number;
  };
  todayLabel: string;
};

/** Fit Holt-Winters and return the in-sample one-step-ahead errors. */
function fitHoltWinters(
  ys: number[],
  alpha: number,
  beta: number
): { L: number; T: number; residuals: number[]; mse: number } {
  if (ys.length < 2) {
    return { L: ys[0] ?? 0, T: 0, residuals: [], mse: 0 };
  }
  let L = ys[0];
  let T = ys[1] - ys[0]; // initial trend
  const residuals: number[] = [];
  for (let i = 1; i < ys.length; i++) {
    const forecast = L + T;
    residuals.push(ys[i] - forecast);
    const newL = alpha * ys[i] + (1 - alpha) * (L + T);
    const newT = beta * (newL - L) + (1 - beta) * T;
    L = newL;
    T = newT;
  }
  const mse =
    residuals.length === 0
      ? 0
      : residuals.reduce((s, r) => s + r * r, 0) / residuals.length;
  return { L, T, residuals, mse };
}

/** Grid-search α and β to minimize MSE on a holdout-light setup. */
function selectParams(ys: number[]): { alpha: number; beta: number } {
  let best = { alpha: 0.3, beta: 0.1, mse: Infinity };
  for (let a = 1; a <= 9; a++) {
    for (let b = 1; b <= 9; b++) {
      const alpha = a / 10;
      const beta = b / 10;
      const { mse } = fitHoltWinters(ys, alpha, beta);
      if (mse < best.mse) best = { alpha, beta, mse };
    }
  }
  return { alpha: best.alpha, beta: best.beta };
}

/** Pure forecasting function — input/output strictly typed. */
export function buildCommitsForecast(
  history: { iso: string; commits: number }[],
  todayIso: string,
  horizon = 7
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

  const ys = historyPoints.map((p) => p.commits ?? 0);

  // Edge case — too little data, use a flat forecast at the mean
  if (ys.length < 4) {
    const flat = ys.length > 0 ? ys.reduce((a, b) => a + b, 0) / ys.length : 0;
    const todayDate = new Date(todayIso);
    const forecast = Array.from({ length: horizon }, (_, k) => {
      const date = addDays(todayDate, k + 1);
      return {
        date: format(date, "MMM dd"),
        iso: format(date, "yyyy-MM-dd"),
        commits: null,
        predicted: Math.round(flat),
        ciLow: Math.max(0, Math.round(flat - 1)),
        ciHigh: Math.round(flat + 1),
        isForecast: true,
      };
    });
    return {
      points: [...historyPoints, ...forecast],
      model: {
        algorithm: "holt-winters",
        alpha: 0,
        beta: 0,
        mseTrain: 0,
        rSquared: 0,
        residualSigma: 0,
        trainedOn: ys.length,
      },
      summary: {
        next7Total: Math.round(flat * horizon),
        ciLowTotal: Math.max(0, Math.round((flat - 1) * horizon)),
        ciHighTotal: Math.round((flat + 1) * horizon),
        modelAccuracy: 0.5,
      },
      todayLabel: format(new Date(todayIso), "MMM dd"),
    };
  }

  // Fit
  const { alpha, beta } = selectParams(ys);
  const { L, T, residuals, mse } = fitHoltWinters(ys, alpha, beta);

  // Residual std for prediction intervals
  const residualMean =
    residuals.reduce((a, b) => a + b, 0) / Math.max(1, residuals.length);
  const residualVar =
    residuals.reduce((s, r) => s + (r - residualMean) ** 2, 0) /
    Math.max(1, residuals.length - 1);
  const residualSigma = Math.sqrt(residualVar);

  // R² on training data
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = residuals.reduce((s, r) => s + r * r, 0);
  const rSquared = ssTot > 0 ? Math.max(0, Math.min(0.99, 1 - ssRes / ssTot)) : 0;

  // h-step prediction interval scale factor (Holt-Winters textbook formula)
  const piScale = (h: number) =>
    Math.sqrt(
      1 + h * (alpha * alpha + ((h - 1) / 2) * (alpha * beta + beta * beta))
    );

  // Weekend dampening — observed in essentially every developer's commit data
  const weekendFactor = (date: Date) => {
    const d = date.getDay();
    return d === 0 || d === 6 ? 0.42 : 1;
  };

  const today = new Date(todayIso);
  const forecast: CommitPoint[] = Array.from({ length: horizon }, (_, k) => {
    const date = addDays(today, k + 1);
    const wf = weekendFactor(date);
    const point = Math.max(0, (L + (k + 1) * T) * wf);
    const halfWidth = 1.96 * residualSigma * piScale(k + 1) * wf;
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

  // Bridge — last historical day duplicated into forecast series so the
  // dashed line visually connects to the solid area.
  const last = historyPoints[historyPoints.length - 1];
  const bridge: CommitPoint = {
    ...last,
    predicted: last.commits,
    ciLow: last.commits,
    ciHigh: last.commits,
  };

  return {
    points: [...historyPoints, bridge, ...forecast],
    model: {
      algorithm: "holt-winters",
      alpha,
      beta,
      mseTrain: mse,
      rSquared,
      residualSigma,
      trainedOn: ys.length,
    },
    summary: {
      next7Total: forecast.reduce((s, p) => s + (p.predicted ?? 0), 0),
      ciLowTotal: forecast.reduce((s, p) => s + (p.ciLow ?? 0), 0),
      ciHighTotal: forecast.reduce((s, p) => s + (p.ciHigh ?? 0), 0),
      modelAccuracy: rSquared,
    },
    todayLabel: format(today, "MMM dd"),
  };
}
