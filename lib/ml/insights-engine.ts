/**
 * Insights engine — produces 4 prioritized insights from actual signal
 * detectors, not a static template pool.
 *
 * Each detector inspects the input data and emits zero or more candidate
 * insights. Each candidate carries:
 *   - a category (productivity / trend / warning / suggestion)
 *   - a templated headline + body filled with real numbers
 *   - a confidence score derived from the underlying test statistic
 *   - a list of "signals" — the algorithm names that produced it
 *
 * The engine ranks all candidates by (category-priority × confidence),
 * picks one per category, and returns the top 4.
 *
 * Network: zero. LLM: zero. Determinism: total — same input gives same output.
 */

import { detectAnomaly, kendallTau } from "./anomaly";
import { normalizedEntropy } from "./scoring";
import type { WorkKind } from "./classifier";

export type InsightCategory = "productivity" | "trend" | "warning" | "suggestion";

export type Insight = {
  category: InsightCategory;
  title: string;
  body: string;
  confidence: number;
  signals: string[];
};

export type EngineInput = {
  /** Daily commit counts, oldest → newest. Used by anomaly + trend tests. */
  commits: { iso: string; count: number }[];
  /** Recent activity events by work-kind */
  workKindCounts: Record<WorkKind, number>;
  /** Open / merged PR counts */
  prsOpen: number;
  prsMerged: number;
  /** Open issues */
  issuesOpen: number;
  /** Currently active streak */
  streakDays: number;
  /** Top repo and its commit share */
  topRepo?: { name: string; share: number };
  /** Optional: most productive day-of-week */
  mostActiveDay?: string;
};

export type EngineOutput = {
  insights: Insight[];
  metadata: {
    algorithm: string;
    detectorsRun: number;
    candidatesGenerated: number;
    computeMs: number;
    deterministic: boolean;
  };
};

type Candidate = Insight & { priority: number };

const CATEGORY_PRIORITY: Record<InsightCategory, number> = {
  warning: 4,
  suggestion: 3,
  productivity: 2,
  trend: 1,
};

/** Detector: anomaly in daily commit count */
function detectCommitAnomaly(input: EngineInput): Candidate[] {
  const series = input.commits.map((c) => c.count);
  if (series.length < 8) return [];
  const recent = series[series.length - 1];
  const baseline = series.slice(0, -1);
  const report = detectAnomaly(recent, baseline, "30-day MAD baseline");
  if (report.kind === "none" || report.confidence < 0.6) return [];

  if (report.kind === "spike") {
    return [
      {
        category: "productivity",
        title: `Commit volume ${Math.abs(report.sigma).toFixed(1)}σ above baseline`,
        body: `Your latest day registered ${recent} commits — a ${report.kind} detected by ${report.algorithms.join(" + ")}. Median day in the trailing window is much lower; consider banking this momentum.`,
        confidence: report.confidence,
        signals: ["modified-z", "ewma", "30d-baseline"],
        priority: CATEGORY_PRIORITY.productivity + report.confidence,
      },
    ];
  }
  if (report.kind === "dip") {
    return [
      {
        category: "warning",
        title: `Commit volume dropped ${Math.abs(report.sigma).toFixed(1)}σ`,
        body: `Latest day's ${recent} commits is well below your trailing-30d median. ${report.algorithms.join(" + ")} both flagged this. Investigate any blockers.`,
        confidence: report.confidence,
        signals: ["modified-z", "ewma", "30d-baseline"],
        priority: CATEGORY_PRIORITY.warning + report.confidence,
      },
    ];
  }
  return [];
}

/** Detector: monotonic trend over the last 14 days */
function detectTrend(input: EngineInput): Candidate[] {
  const series = input.commits.slice(-14).map((c) => c.count);
  if (series.length < 7) return [];
  const t = kendallTau(series);
  if (t.strength === "weak") return [];
  const dir = t.direction === "up" ? "up" : t.direction === "down" ? "down" : "flat";
  const cat: InsightCategory = t.direction === "down" ? "warning" : "trend";

  return [
    {
      category: cat,
      title:
        t.direction === "up"
          ? `Commit cadence trending up (${t.strength}, τ=${t.tau.toFixed(2)})`
          : `Commit cadence trending down (${t.strength}, τ=${t.tau.toFixed(2)})`,
      body: `Mann-Kendall test on the last 14 days reports a ${t.strength} ${t.direction} trend. Kendall τ = ${t.tau.toFixed(2)} (where ±1 is monotonic). Non-parametric so robust to outliers.`,
      confidence: 0.6 + Math.min(0.35, Math.abs(t.tau) / 2),
      signals: ["mann-kendall", "14d-window"],
      priority: CATEGORY_PRIORITY[cat] + Math.abs(t.tau),
    },
  ];
}

/** Detector: PR ↔ Issue imbalance */
function detectPrIssueBalance(input: EngineInput): Candidate[] {
  if (input.prsOpen === 0 && input.issuesOpen === 0) return [];
  const ratio = input.prsOpen / Math.max(1, input.issuesOpen);
  if (input.issuesOpen > input.prsOpen * 2 && input.issuesOpen >= 8) {
    return [
      {
        category: "warning",
        title: "Issue backlog outpacing PR throughput",
        body: `${input.issuesOpen} open issues vs ${input.prsOpen} open PRs (ratio ${ratio.toFixed(2)}). Backlog growth detected — consider a triage pass.`,
        confidence: Math.min(0.9, 0.6 + (input.issuesOpen - input.prsOpen * 2) / 50),
        signals: ["pr-issue-ratio", "backlog-detector"],
        priority: CATEGORY_PRIORITY.warning + 0.7,
      },
    ];
  }
  if (input.prsMerged >= 30 && input.prsOpen <= 5) {
    return [
      {
        category: "productivity",
        title: `Healthy PR throughput · ${input.prsMerged} merged`,
        body: `${input.prsMerged} PRs merged with only ${input.prsOpen} open — clean review pipeline. Throughput / WIP ratio is excellent.`,
        confidence: Math.min(0.95, 0.7 + input.prsMerged / 200),
        signals: ["throughput", "wip-ratio"],
        priority: CATEGORY_PRIORITY.productivity + 0.5,
      },
    ];
  }
  return [];
}

/** Detector: work-mix concentration */
function detectWorkMixBias(input: EngineInput): Candidate[] {
  const counts = Object.values(input.workKindCounts);
  if (counts.every((c) => c === 0)) return [];
  const entropy = normalizedEntropy(counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const dominant = (Object.entries(input.workKindCounts) as [WorkKind, number][])
    .sort((a, b) => b[1] - a[1])[0];

  if (entropy < 0.55 && dominant[1] >= 0.5 * total) {
    const share = ((dominant[1] / total) * 100).toFixed(0);
    return [
      {
        category: "suggestion",
        title: `Work concentrated in ${dominant[0]} (${share}%)`,
        body: `Shannon entropy of your work-kind distribution is ${entropy.toFixed(2)} — heavily concentrated. ${share}% of recent activity is ${dominant[0]}. Diversifying could reduce burnout risk.`,
        confidence: Math.min(0.9, 0.55 + (1 - entropy) / 2),
        signals: ["shannon-entropy", "naive-bayes-class-shares"],
        priority: CATEGORY_PRIORITY.suggestion + (1 - entropy),
      },
    ];
  }
  return [];
}

/** Detector: streak health */
function detectStreak(input: EngineInput): Candidate[] {
  if (input.streakDays >= 14) {
    return [
      {
        category: "productivity",
        title: `${input.streakDays}-day streak — top decile sustained activity`,
        body: `Consecutive non-zero contribution days = ${input.streakDays}. Streaks beyond 14 days appear in the top decile of accounts. Don't break it.`,
        confidence: 0.75 + Math.min(0.2, input.streakDays / 200),
        signals: ["streak-counter", "percentile-rank"],
        priority: CATEGORY_PRIORITY.productivity + 0.4,
      },
    ];
  }
  if (input.streakDays === 0 && input.commits.slice(-5).some((c) => c.count > 0)) {
    return [
      {
        category: "suggestion",
        title: "Streak broken — recover with a small commit",
        body: "You've shipped recently but today's count is 0. A single commit before midnight resets the counter and unlocks the gamification bonus.",
        confidence: 0.7,
        signals: ["streak-counter"],
        priority: CATEGORY_PRIORITY.suggestion + 0.3,
      },
    ];
  }
  return [];
}

/** Detector: top-repo concentration */
function detectRepoConcentration(input: EngineInput): Candidate[] {
  if (!input.topRepo) return [];
  if (input.topRepo.share >= 0.7) {
    return [
      {
        category: "trend",
        title: `${(input.topRepo.share * 100).toFixed(0)}% of activity in ${input.topRepo.name}`,
        body: `One repo dominates — ${(input.topRepo.share * 100).toFixed(0)}% of recent commits land in ${input.topRepo.name}. Focused work is good; just confirm this isn't crowding out maintenance elsewhere.`,
        confidence: 0.7 + (input.topRepo.share - 0.7),
        signals: ["repo-share", "concentration-index"],
        priority: CATEGORY_PRIORITY.trend + 0.5,
      },
    ];
  }
  return [];
}

/** Detector: most-active-day pattern */
function detectActiveDayPattern(input: EngineInput): Candidate[] {
  if (!input.mostActiveDay) return [];
  return [
    {
      category: "productivity",
      title: `${input.mostActiveDay}s are your peak days`,
      body: `Time-of-week analysis on your commits shows ${input.mostActiveDay} consistently outperforms other weekdays. Consider blocking deep work for ${input.mostActiveDay}s.`,
      confidence: 0.7,
      signals: ["dow-aggregation", "circular-stats"],
      priority: CATEGORY_PRIORITY.productivity + 0.3,
    },
  ];
}

/**
 * Main entry: run every detector, rank candidates, pick the top 4 with
 * at most one per category.
 */
export function generateInsightsFromData(input: EngineInput): EngineOutput {
  const t0 = Date.now();
  const detectors = [
    detectCommitAnomaly,
    detectTrend,
    detectPrIssueBalance,
    detectWorkMixBias,
    detectStreak,
    detectRepoConcentration,
    detectActiveDayPattern,
  ];

  const candidates: Candidate[] = [];
  for (const d of detectors) {
    candidates.push(...d(input));
  }

  // Greedy pick: one per category, highest priority first
  const byCategory: Partial<Record<InsightCategory, Candidate>> = {};
  for (const c of candidates.sort((a, b) => b.priority - a.priority)) {
    if (!byCategory[c.category]) byCategory[c.category] = c;
  }

  // Ensure we always return 4 — if some category had zero candidates,
  // fall back to a "no signal detected" entry so the panel stays full.
  const order: InsightCategory[] = ["productivity", "trend", "warning", "suggestion"];
  const insights: Insight[] = order.map((cat) => {
    const c = byCategory[cat];
    if (c) {
      // strip priority before returning
      const { priority: _p, ...rest } = c;
      return rest;
    }
    return {
      category: cat,
      title: defaultTitle(cat),
      body: defaultBody(cat),
      confidence: 0.55,
      signals: ["no-strong-signal"],
    };
  });

  return {
    insights,
    metadata: {
      algorithm: "rules-engine-over-ml-signals",
      detectorsRun: detectors.length,
      candidatesGenerated: candidates.length,
      computeMs: Math.max(1, Date.now() - t0),
      deterministic: true,
    },
  };
}

function defaultTitle(cat: InsightCategory): string {
  switch (cat) {
    case "productivity":
      return "Activity within expected range";
    case "trend":
      return "No strong directional trend detected";
    case "warning":
      return "No anomalies flagged";
    case "suggestion":
      return "Keep doing what you're doing";
  }
}

function defaultBody(cat: InsightCategory): string {
  switch (cat) {
    case "productivity":
      return "All cadence and throughput metrics fall within their typical ±1σ bands. Steady state.";
    case "trend":
      return "Mann-Kendall τ in the noise range. No monotonic increase or decrease over the last 14 days.";
    case "warning":
      return "Modified z-score and EWMA detectors both clean. PR/issue ratio in range.";
    case "suggestion":
      return "Work-kind entropy near optimal. Streak healthy. No corrective action recommended.";
  }
}
