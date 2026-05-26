/**
 * Legacy shape preserved for components that still import these types — but
 * the actual insight generation now flows through lib/ml/insights-engine.ts.
 *
 * This file is intentionally minimal. It re-exports the canonical types and
 * provides a typed deterministic fallback ONLY for the case where neither
 * the engine nor enrichment has run yet (e.g. very first paint before
 * useEffect fires).
 */

export type {
  Insight,
  InsightCategory,
} from "@/lib/ml/insights-engine";

export type ModelMetadata = {
  primaryEngine: string;
  enrichment: "claude" | "none";
  detectorsRun: number;
  candidatesGenerated: number;
  computeMs: number;
  classifier: {
    algorithm: string;
    vocabSize: number;
    trainingSize: number;
  };
  network: "offline-capable";
};

import type { Insight } from "@/lib/ml/insights-engine";

export const fallbackInsights: Insight[] = [
  {
    category: "productivity",
    title: "Local engine warming up",
    body: "Running detectors over the last 30 days of activity. Anomaly, trend, classifier, and entropy tests will replace this in a moment.",
    confidence: 0.55,
    signals: ["pre-render-placeholder"],
  },
  {
    category: "trend",
    title: "Computing trend statistics",
    body: "Mann-Kendall τ and EWMA smoothing in progress on the commit series.",
    confidence: 0.55,
    signals: ["pre-render-placeholder"],
  },
  {
    category: "warning",
    title: "Scanning for anomalies",
    body: "Modified z-score + EWMA control chart running across all metrics.",
    confidence: 0.55,
    signals: ["pre-render-placeholder"],
  },
  {
    category: "suggestion",
    title: "Work-mix entropy analysis pending",
    body: "Naive Bayes classifier categorizing recent events to compute Shannon entropy.",
    confidence: 0.55,
    signals: ["pre-render-placeholder"],
  },
];

export const fallbackMetadata: ModelMetadata = {
  primaryEngine: "rules-engine-over-ml-signals",
  enrichment: "none",
  detectorsRun: 7,
  candidatesGenerated: 0,
  computeMs: 0,
  classifier: {
    algorithm: "multinomial-naive-bayes",
    vocabSize: 0,
    trainingSize: 0,
  },
  network: "offline-capable",
};
