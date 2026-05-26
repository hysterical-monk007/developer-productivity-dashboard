/**
 * Compute anomaly badges for each metric card by running the real anomaly
 * detector over the metric's sparkline history.
 *
 * The sparkline is 7 points; we treat the last point as "current" and the
 * preceding 6 as the baseline. Combined with the metric's own 30-day series
 * (where available) this gives the modified z-score + EWMA test enough
 * baseline to produce a meaningful report.
 */

import { detectAnomaly, type AnomalyReport } from "./anomaly";
import type { Metric } from "@/mock/metrics";
import { commitsLast30Days } from "@/mock/timeseries";

export function computeMetricAnomaly(metric: Metric): AnomalyReport | null {
  // Pull the underlying numeric series. For commits we have a long 30-day
  // history; for everything else we use the 7-point sparkline.
  let series: number[];
  let baselineLabel = "30-day rolling baseline";

  if (metric.key === "commits") {
    series = commitsLast30Days
      .filter((p) => !p.isForecast && p.commits !== null)
      .map((p) => p.commits as number);
    baselineLabel = "30-day rolling baseline";
  } else {
    series = metric.sparkline.map((p) => p.v);
    baselineLabel = "7-point sparkline baseline";
  }

  if (series.length < 4) return null;

  const current = series[series.length - 1];
  const baseline = series.slice(0, -1);
  const report = detectAnomaly(current, baseline, baselineLabel);

  // Filter out noise — only surface badges with meaningful confidence
  if (report.kind === "none" || report.confidence < 0.55) return null;
  return report;
}
