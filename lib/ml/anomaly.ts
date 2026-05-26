/**
 * Anomaly detection — robust statistics, no network, no LLM.
 *
 * Two algorithms ship here:
 *
 *   1. Modified z-score (Iglewicz & Hoaglin, 1993)
 *        Uses median + median absolute deviation (MAD) instead of mean + std.
 *        Robust to outliers in the baseline. The standard threshold is |z| > 3.5
 *        for "outlier", which we use as anomaly.
 *
 *   2. EWMA control chart
 *        Exponentially-weighted moving average with a 3σ upper/lower band.
 *        Captures gradual drift that z-score misses.
 *
 * Both return a structured AnomalyReport so the UI can render a real
 * explanation: which test fired, what the baseline was, how far the current
 * point is from it.
 */

export type AnomalyKind = "spike" | "dip" | "drift" | "none";

export type AnomalyReport = {
  kind: AnomalyKind;
  sigma: number;          // signed standardized deviation
  zModified: number;      // modified z-score on the MAD scale
  ewmaDelta: number;      // distance from EWMA band, in band-widths
  baseline: string;       // human-readable baseline window
  algorithms: string[];   // which detectors fired
  confidence: number;     // 0..1, how strongly we believe the anomaly
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mad(values: number[], med: number): number {
  // Median Absolute Deviation. The constant 0.6745 makes it consistent with σ
  // for normally-distributed data.
  if (values.length === 0) return 0;
  const deviations = values.map((v) => Math.abs(v - med));
  const m = median(deviations);
  return m === 0 ? 1e-9 : m;
}

/**
 * Modified z-score. Threshold of 3.5 is the conventional "outlier" cutoff.
 * Returns the signed score (positive = above baseline).
 */
export function modifiedZ(value: number, baseline: number[]): number {
  if (baseline.length === 0) return 0;
  const med = median(baseline);
  const m = mad(baseline, med);
  return (0.6745 * (value - med)) / m;
}

/**
 * Compute an EWMA-smoothed series and its 3σ control band. Returns the
 * standardized distance of the *latest* point from its band.
 *
 * lambda controls smoothing: smaller = more responsive, larger = more inertia.
 * 0.2 is a textbook default for process-control work.
 */
export function ewmaDelta(series: number[], lambda = 0.2): number {
  if (series.length < 4) return 0;
  // EWMA series
  const ewma: number[] = [series[0]];
  for (let i = 1; i < series.length; i++) {
    ewma.push(lambda * series[i] + (1 - lambda) * ewma[i - 1]);
  }
  // Estimate σ of the input
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance =
    series.reduce((s, v) => s + (v - mean) ** 2, 0) /
    Math.max(1, series.length - 1);
  const sigma = Math.sqrt(variance);
  if (sigma === 0) return 0;

  // EWMA variance is sigma² * λ/(2-λ) — but we want the deviation in σ-units
  // of the EWMA itself
  const ewmaSigma = sigma * Math.sqrt(lambda / (2 - lambda));
  if (ewmaSigma === 0) return 0;

  const last = ewma[ewma.length - 1];
  // How many band-widths is the latest EWMA point from the long-term mean?
  return (last - mean) / (3 * ewmaSigma);
}

/**
 * High-level detector. Combines modified z and EWMA, returns a single report.
 *
 *   - baselineWindowLabel: e.g. "12-week rolling mean"
 *   - lambda for EWMA — defaults to 0.2
 */
export function detectAnomaly(
  current: number,
  baseline: number[],
  baselineWindowLabel = "rolling baseline",
  lambda = 0.2
): AnomalyReport {
  if (baseline.length < 4) {
    return {
      kind: "none",
      sigma: 0,
      zModified: 0,
      ewmaDelta: 0,
      baseline: baselineWindowLabel,
      algorithms: [],
      confidence: 0,
    };
  }

  const z = modifiedZ(current, baseline);
  // EWMA is computed on the baseline ∪ {current}, but here baseline is the
  // historical window; we include current at the end to get the most recent
  // smoothed estimate.
  const ewma = ewmaDelta([...baseline, current], lambda);

  const algorithms: string[] = [];
  if (Math.abs(z) > 3.5) algorithms.push("modified-z");
  if (Math.abs(ewma) > 1) algorithms.push("ewma-control");

  // Pick the dominant signal
  let kind: AnomalyKind = "none";
  if (algorithms.length > 0) {
    if (z > 3.5 || ewma > 1) kind = "spike";
    else if (z < -3.5 || ewma < -1) kind = "dip";
    else kind = "drift";
  } else if (Math.abs(z) > 2 || Math.abs(ewma) > 0.6) {
    // Soft anomaly — flagged but not at the "outlier" threshold
    kind = z > 0 || ewma > 0 ? "spike" : "dip";
    algorithms.push("soft-deviation");
  }

  // Confidence: weighted blend of the two test statistics, capped at 0.98
  const zConf = Math.min(1, Math.abs(z) / 5);
  const ewmaConf = Math.min(1, Math.abs(ewma) / 2);
  const confidence =
    kind === "none" ? 0 : Math.min(0.98, 0.5 + 0.5 * Math.max(zConf, ewmaConf));

  return {
    kind,
    sigma: z, // expose the modified-z as the canonical "σ" value for UI badges
    zModified: z,
    ewmaDelta: ewma,
    baseline: baselineWindowLabel,
    algorithms,
    confidence,
  };
}

/**
 * Trend detection via Mann-Kendall test.
 *
 * Returns a normalized τ in [-1, 1] indicating monotonic trend strength.
 * Positive = increasing, negative = decreasing. |τ| > 0.3 is "meaningful".
 *
 * Non-parametric, robust to outliers, no distribution assumptions. Used as
 * a feature for the insights engine.
 */
export function kendallTau(series: number[]): {
  tau: number;
  direction: "up" | "down" | "flat";
  strength: "strong" | "moderate" | "weak";
} {
  const n = series.length;
  if (n < 3) return { tau: 0, direction: "flat", strength: "weak" };
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = series[j] - series[i];
      if (diff > 0) concordant++;
      else if (diff < 0) discordant++;
    }
  }
  const total = (n * (n - 1)) / 2;
  const tau = (concordant - discordant) / total;
  const absT = Math.abs(tau);
  return {
    tau,
    direction: tau > 0.1 ? "up" : tau < -0.1 ? "down" : "flat",
    strength: absT > 0.5 ? "strong" : absT > 0.25 ? "moderate" : "weak",
  };
}
