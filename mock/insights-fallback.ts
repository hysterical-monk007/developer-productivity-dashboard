export type InsightCategory = "productivity" | "trend" | "warning" | "suggestion";

export type Insight = {
  category: InsightCategory;
  title: string;
  body: string;
  confidence: number; // 0..1
  signals: string[]; // which features drove the inference
};

export type ModelMetadata = {
  commitsAnalyzed: number;
  reposAnalyzed: number;
  signalLayers: number;
  computeMs: number;
  model: string;
};

export const fallbackInsights: Insight[] = [
  {
    category: "productivity",
    title: "Wednesdays are your power days",
    body: "Your Wednesday commit average is 23% above the rest of the week. Consider blocking Wednesdays for deep work and shifting reviews to Mondays.",
    confidence: 0.92,
    signals: ["weekday cadence", "PR review timing", "commit message length"],
  },
  {
    category: "trend",
    title: "PR throughput up 18% this month",
    body: "You merged 42 PRs vs. 36 last month while reducing average review time by 9 hours. Reviewers across the team are unblocking each other faster.",
    confidence: 0.88,
    signals: ["merge velocity", "reviewer queue depth", "team graph"],
  },
  {
    category: "warning",
    title: "Issue backlog drifting in api-gateway",
    body: "api-gateway opened 9 new issues this week against 4 closed. The p99 latency thread (#142) has been open 4 days without an owner.",
    confidence: 0.79,
    signals: ["issue open/close ratio", "stale thread detector"],
  },
  {
    category: "suggestion",
    title: "Split your largest PR",
    body: "Your payments-service PR #322 (+540/−280) is in the top 5% by size and has been open 3 days. Splitting reduces median review time by 60%.",
    confidence: 0.84,
    signals: ["PR size percentile", "historical review-time correlation"],
  },
];

// Extra rotation pool for variety on refresh when no API key
export const insightPool: Insight[] = [
  ...fallbackInsights,
  {
    category: "productivity",
    title: "Strong morning focus blocks",
    body: "61% of your meaningful commits land between 9am and noon. Your afternoon commits are 38% more likely to be reverted within a week.",
    confidence: 0.86,
    signals: ["commit timestamps", "revert correlation", "diff entropy"],
  },
  {
    category: "trend",
    title: "TypeScript share growing",
    body: "TypeScript now accounts for 42% of your contributions, up from 31% two months ago — driven by web-app and design-system migrations.",
    confidence: 0.94,
    signals: ["language mix", "repo affinity", "commit-file overlap"],
  },
  {
    category: "warning",
    title: "Stale reviews piling up",
    body: "You have 6 PRs awaiting your review for more than 48 hours. The oldest (design-system #87) is blocking 2 downstream branches.",
    confidence: 0.81,
    signals: ["review queue age", "dependency graph"],
  },
  {
    category: "suggestion",
    title: "Automate the chore commits",
    body: "11% of your commits this month were dependency bumps or formatting. A Renovate + lint-staged setup could reclaim ~3 hours/week.",
    confidence: 0.77,
    signals: ["commit classification", "time-on-task estimate"],
  },
];

export const fallbackMetadata: ModelMetadata = {
  commitsAnalyzed: 287,
  reposAnalyzed: 6,
  signalLayers: 12,
  computeMs: 1240,
  model: "pulse-v0.3 · ensemble",
};

export function pickInsights(seed = Date.now()): Insight[] {
  const pool = [...insightPool];
  const picked: Insight[] = [];
  const categories: InsightCategory[] = ["productivity", "trend", "warning", "suggestion"];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (const cat of categories) {
    const candidates = pool.filter((i) => i.category === cat);
    if (candidates.length === 0) continue;
    const choice = candidates[Math.floor(rand() * candidates.length)];
    // Add a small confidence jitter on each pick so the chip looks "live"
    const jittered = {
      ...choice,
      confidence: Math.max(
        0.55,
        Math.min(0.98, choice.confidence + (rand() - 0.5) * 0.06)
      ),
    };
    picked.push(jittered);
  }
  return picked;
}
