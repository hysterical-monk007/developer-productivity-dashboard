/**
 * Productivity index — single 0–100 score from a vector of features.
 *
 * Each feature is normalized to [0, 1] using a soft saturating logistic
 *   norm(x; k) = 1 / (1 + exp(-k * (x - x0)))
 * with feature-specific k and x0 so that "good" values land around 0.7+ and
 * "bad" values around 0.3-.
 *
 * Weights were derived from a hand-tuned linear model (essentially a 1-PC
 * projection of the feature vector). They're surfaced in the output so the
 * UI can show each feature's contribution.
 */

export type FeatureName =
  | "commitCadence"
  | "streak"
  | "prThroughput"
  | "reviewVelocity"
  | "issueClosure"
  | "workMixBalance";

export type ScoreInput = {
  /** Average commits per active day, last 30 days */
  commitsPerActiveDay: number;
  /** Current consecutive-day streak */
  streakDays: number;
  /** PRs merged in the last 30 days */
  prsMerged30d: number;
  /** Average hours from PR opened to merged */
  reviewLatencyHours: number;
  /** Issues closed / opened ratio over last 30 days */
  issueCloseRate: number;
  /** Shannon entropy of work-kind distribution, normalized to [0, 1] */
  workMixEntropy: number;
};

export type ScoreOutput = {
  score: number; // 0..100
  grade: "S" | "A" | "B" | "C" | "D";
  features: { name: FeatureName; raw: number; normalized: number; contribution: number }[];
  algorithm: string;
};

// Soft logistic normalizer. k controls steepness, x0 is the midpoint.
const norm = (x: number, k: number, x0: number) =>
  1 / (1 + Math.exp(-k * (x - x0)));

const WEIGHTS: Record<FeatureName, number> = {
  commitCadence: 0.25,
  streak: 0.15,
  prThroughput: 0.2,
  reviewVelocity: 0.15,
  issueClosure: 0.15,
  workMixBalance: 0.1,
};

const NORMALIZERS: Record<FeatureName, (x: number) => number> = {
  // 6 commits/active-day is "good", 1 is "low", asymptotes near 12
  commitCadence: (x) => norm(x, 0.4, 5),
  // 14 days streak gets ~0.7; 30+ gets ~0.95
  streak: (x) => norm(x, 0.15, 10),
  // 30 PRs/month is great, 5 is low
  prThroughput: (x) => norm(x, 0.15, 12),
  // Lower is better — invert. 24h is the midpoint.
  reviewVelocity: (x) => 1 - norm(x, 0.05, 36),
  // 0.8+ closure rate is healthy; below 0.5 is a backlog problem
  issueClosure: (x) => norm(x, 12, 0.65),
  // Mid entropy is best — too uniform AND too concentrated are bad.
  // We invert the |x - 0.6| distance.
  workMixBalance: (x) => 1 - Math.min(1, Math.abs(x - 0.6) / 0.6),
};

export function computeProductivityScore(input: ScoreInput): ScoreOutput {
  const raw: Record<FeatureName, number> = {
    commitCadence: input.commitsPerActiveDay,
    streak: input.streakDays,
    prThroughput: input.prsMerged30d,
    reviewVelocity: input.reviewLatencyHours,
    issueClosure: input.issueCloseRate,
    workMixBalance: input.workMixEntropy,
  };

  const features: ScoreOutput["features"] = [];
  let weightedSum = 0;
  for (const name of Object.keys(WEIGHTS) as FeatureName[]) {
    const normalized = NORMALIZERS[name](raw[name]);
    const contribution = WEIGHTS[name] * normalized;
    weightedSum += contribution;
    features.push({ name, raw: raw[name], normalized, contribution });
  }
  const score = Math.round(weightedSum * 100);

  const grade: ScoreOutput["grade"] =
    score >= 90 ? "S" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D";

  return {
    score,
    grade,
    features,
    algorithm: "weighted-logistic-aggregation",
  };
}

/**
 * Shannon entropy of a categorical distribution, normalized to [0, 1] by
 * dividing by log2(n_classes).
 */
export function normalizedEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const probs = counts.map((c) => c / total).filter((p) => p > 0);
  if (probs.length <= 1) return 0;
  const h = -probs.reduce((s, p) => s + p * Math.log2(p), 0);
  return h / Math.log2(counts.length);
}
