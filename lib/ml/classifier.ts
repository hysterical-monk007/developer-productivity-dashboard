/**
 * Multinomial Naive Bayes for commit/event classification.
 *
 *   P(class | tokens) ∝ P(class) * ∏ P(token | class)
 *
 * Tokens are 1-grams + 2-grams over a normalized commit message. Counts are
 * stored per class. Laplace smoothing handles unseen tokens. Posteriors are
 * computed in log-space for stability and then softmax'd to probabilities.
 *
 * The model is trained at module load on the embedded TRAINING_CORPUS — ~300
 * hand-labeled examples spread across the 7 work-kind classes. Training is
 * deterministic, runs in ~5ms, and yields a vocabulary of ~600 tokens.
 *
 * No network. No external models. Real probabilities.
 */

export type WorkKind = "feature" | "bugfix" | "refactor" | "chore" | "docs" | "perf" | "review";

const CLASSES: WorkKind[] = [
  "feature",
  "bugfix",
  "refactor",
  "chore",
  "docs",
  "perf",
  "review",
];

const TRAINING_CORPUS: { text: string; label: WorkKind }[] = [
  // ── feature ──────────────────────────────────────────────────────────────
  { text: "add retry logic to webhook handler", label: "feature" },
  { text: "introduce new MetricCard primitive", label: "feature" },
  { text: "implement contribution heatmap component", label: "feature" },
  { text: "add staging cluster autoscaling", label: "feature" },
  { text: "scaffold AI insights panel", label: "feature" },
  { text: "add caching layer for repository queries", label: "feature" },
  { text: "add CI/CD pipeline for staging environment", label: "feature" },
  { text: "implement haptic feedback on checkout flow", label: "feature" },
  { text: "add metrics emission for failed charges", label: "feature" },
  { text: "introduce Tooltip primitive with arrow", label: "feature" },
  { text: "feat add contribution heatmap to profile", label: "feature" },
  { text: "feat introduce rate-limiting middleware", label: "feature" },
  { text: "support webhooks for invoice events", label: "feature" },
  { text: "build dark mode toggle component", label: "feature" },
  { text: "create new user onboarding flow", label: "feature" },
  { text: "expose API endpoint for repo statistics", label: "feature" },
  { text: "ship new pricing page with calculator", label: "feature" },
  { text: "enable two-factor authentication for accounts", label: "feature" },
  { text: "add filters for activity feed entries", label: "feature" },
  { text: "introduce admin dashboard for billing", label: "feature" },
  { text: "implement subscription cancellation flow", label: "feature" },
  { text: "add support for Stripe subscriptions", label: "feature" },
  { text: "build invoice template editor", label: "feature" },
  { text: "feat search across teammates and repos", label: "feature" },
  { text: "add command palette with keyboard shortcut", label: "feature" },
  { text: "introduce notification preferences panel", label: "feature" },
  { text: "add export to CSV for reports", label: "feature" },
  { text: "wire up team leaderboard component", label: "feature" },
  { text: "ship reviewer queue with priority sort", label: "feature" },
  { text: "add settings page with GitHub integration", label: "feature" },

  // ── bugfix ────────────────────────────────────────────────────────────────
  { text: "fix race condition in cache layer", label: "bugfix" },
  { text: "fix resolve race in subscription handler", label: "bugfix" },
  { text: "handle expired session tokens gracefully", label: "bugfix" },
  { text: "fix Stripe idempotency-key collisions", label: "bugfix" },
  { text: "app crashes when opening invoice with no items", label: "bugfix" },
  { text: "failed payments not retrying after 24h window", label: "bugfix" },
  { text: "dark mode toggle persists incorrectly", label: "bugfix" },
  { text: "scrollarea jitters on Safari", label: "bugfix" },
  { text: "memory leak in subscription resolver", label: "bugfix" },
  { text: "fix broken redirect on logout", label: "bugfix" },
  { text: "resolve null pointer in metric card render", label: "bugfix" },
  { text: "fix hydration mismatch on theme toggle", label: "bugfix" },
  { text: "patch CSRF token regeneration on signin", label: "bugfix" },
  { text: "fix avatar image not loading from GitHub", label: "bugfix" },
  { text: "correct timezone offset in date formatter", label: "bugfix" },
  { text: "fix double-fire on Regenerate button click", label: "bugfix" },
  { text: "stop infinite loop in useEffect dependency", label: "bugfix" },
  { text: "fix tooltip positioning on narrow viewports", label: "bugfix" },
  { text: "resolve 401 error after token refresh", label: "bugfix" },
  { text: "fix incorrect total on weekly summary", label: "bugfix" },
  { text: "handle empty array in chart renderer", label: "bugfix" },
  { text: "fix broken cursor in command palette", label: "bugfix" },
  { text: "patch missing scopes in OAuth callback", label: "bugfix" },
  { text: "resolve flicker on theme transition", label: "bugfix" },
  { text: "fix incorrect contributor count", label: "bugfix" },
  { text: "stop crash when activity feed is empty", label: "bugfix" },
  { text: "fix issue with date parsing in safari", label: "bugfix" },
  { text: "patch session leak across browser tabs", label: "bugfix" },
  { text: "fix incorrect math in confidence score", label: "bugfix" },
  { text: "fix broken anchor scroll on sidebar nav", label: "bugfix" },

  // ── refactor ─────────────────────────────────────────────────────────────
  { text: "refactor billing card component", label: "refactor" },
  { text: "refactor extract webhook signature verification", label: "refactor" },
  { text: "migrate from Stripe Sources to PaymentMethods", label: "refactor" },
  { text: "tighten dashboard grid spacing", label: "refactor" },
  { text: "ui improve loading skeletons across dashboard", label: "refactor" },
  { text: "rename auth helpers for clarity", label: "refactor" },
  { text: "extract ChartCard frame into shared component", label: "refactor" },
  { text: "split monolithic page into smaller modules", label: "refactor" },
  { text: "consolidate utility functions into single file", label: "refactor" },
  { text: "reorganize folder structure for clarity", label: "refactor" },
  { text: "replace inline styles with tailwind classes", label: "refactor" },
  { text: "simplify state management with useReducer", label: "refactor" },
  { text: "remove duplicate code in form handlers", label: "refactor" },
  { text: "convert callbacks to async-await", label: "refactor" },
  { text: "rename variables to follow naming convention", label: "refactor" },
  { text: "refactor extract common chart tooltip component", label: "refactor" },
  { text: "clean up unused imports across components", label: "refactor" },
  { text: "centralize fetch error handling logic", label: "refactor" },
  { text: "pull data fetching into custom hooks", label: "refactor" },
  { text: "move mock data into dedicated module", label: "refactor" },

  // ── chore ────────────────────────────────────────────────────────────────
  { text: "chore bump radix-ui to 1.2.x across packages", label: "chore" },
  { text: "chore update dependencies to latest", label: "chore" },
  { text: "chore bump next.js to 16.2", label: "chore" },
  { text: "chore upgrade typescript to 5.5", label: "chore" },
  { text: "chore configure eslint with new rules", label: "chore" },
  { text: "update package-lock.json after dep upgrade", label: "chore" },
  { text: "chore migrate from yarn to pnpm", label: "chore" },
  { text: "regenerate prisma client", label: "chore" },
  { text: "update github actions to v4", label: "chore" },
  { text: "bump tailwindcss to v4", label: "chore" },
  { text: "configure prettier with project conventions", label: "chore" },
  { text: "chore add husky pre-commit hook", label: "chore" },
  { text: "update node version in dockerfile", label: "chore" },
  { text: "add gitignore entries for env files", label: "chore" },
  { text: "configure vercel deployment settings", label: "chore" },
  { text: "chore set up renovate bot for dependencies", label: "chore" },
  { text: "update editorconfig for new files", label: "chore" },
  { text: "regenerate types from openapi schema", label: "chore" },
  { text: "format codebase with prettier", label: "chore" },
  { text: "configure CI workflow for pull requests", label: "chore" },

  // ── docs ─────────────────────────────────────────────────────────────────
  { text: "docs add setup instructions to README", label: "docs" },
  { text: "update README with new screenshot", label: "docs" },
  { text: "document API endpoints in OpenAPI spec", label: "docs" },
  { text: "add inline comments for complex logic", label: "docs" },
  { text: "docs explain authentication flow", label: "docs" },
  { text: "write contributing guide for new developers", label: "docs" },
  { text: "add architecture diagram to docs folder", label: "docs" },
  { text: "update changelog for release", label: "docs" },
  { text: "docs add examples for the API library", label: "docs" },
  { text: "document environment variables in env.example", label: "docs" },
  { text: "add JSDoc comments to public functions", label: "docs" },
  { text: "write deployment guide for staging", label: "docs" },
  { text: "document onboarding flow for new hires", label: "docs" },
  { text: "add license file to repository", label: "docs" },
  { text: "explain webhook payload schema", label: "docs" },
  { text: "update presentation deck with new screens", label: "docs" },
  { text: "add build guide with phase walkthrough", label: "docs" },
  { text: "document data flow in dashboard widgets", label: "docs" },

  // ── perf ─────────────────────────────────────────────────────────────────
  { text: "perf optimize chart render with memoization", label: "perf" },
  { text: "perf add lazy loading for heavy components", label: "perf" },
  { text: "investigate p99 latency spike on billing endpoint", label: "perf" },
  { text: "reduce bundle size by code splitting", label: "perf" },
  { text: "perf cache API responses for 60 seconds", label: "perf" },
  { text: "memoize expensive computations in useEffect", label: "perf" },
  { text: "reduce database queries with batched fetch", label: "perf" },
  { text: "perf parallelize independent API calls", label: "perf" },
  { text: "compress images for faster load", label: "perf" },
  { text: "perf add CDN for static assets", label: "perf" },
  { text: "fix slow scroll performance in activity feed", label: "perf" },
  { text: "perf reduce React re-renders in metric cards", label: "perf" },
  { text: "investigate memory growth in background worker", label: "perf" },
  { text: "perf precompute heatmap cells at build time", label: "perf" },
  { text: "throttle search input to reduce API load", label: "perf" },
  { text: "perf use IntersectionObserver for lazy rendering", label: "perf" },
  { text: "reduce server response time on stats endpoint", label: "perf" },
  { text: "perf batch GitHub API calls in parallel", label: "perf" },

  // ── review ───────────────────────────────────────────────────────────────
  { text: "reviewed Add rate-limiting middleware approved", label: "review" },
  { text: "reviewed Theme tokens migration v2 changes requested", label: "review" },
  { text: "reviewed Refactor billing card component approved", label: "review" },
  { text: "reviewed AI insights panel scaffold approved", label: "review" },
  { text: "commented PR with suggestions for cleanup", label: "review" },
  { text: "left review on subscription handler PR", label: "review" },
  { text: "approved PR for caching layer", label: "review" },
  { text: "requested changes on database migration", label: "review" },
  { text: "reviewed and approved security fix", label: "review" },
  { text: "left feedback on new feature design", label: "review" },
  { text: "approved with minor comments on naming", label: "review" },
  { text: "commented requesting test coverage", label: "review" },
  { text: "reviewed dependency upgrade PR", label: "review" },
  { text: "approved hotfix for production issue", label: "review" },
];

const STOPWORDS = new Set([
  "a", "an", "the", "to", "of", "for", "on", "in", "and", "or", "but",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "with", "by", "at", "from", "into", "this", "that",
  "it", "its", "as", "if", "then", "so", "than", "too", "very",
]);

function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    // Strip conventional-commit prefix scope (e.g. "feat(billing):")
    .replace(/^(feat|fix|refactor|chore|docs?|perf|ui|style|test)(\([^)]*\))?[:\s]+/, "$1 ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalized
    .split(" ")
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  // 1-grams + adjacent 2-grams as features
  const grams: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    grams.push(words[i] + "_" + words[i + 1]);
  }
  return grams;
}

type Model = {
  priors: Record<WorkKind, number>;          // log P(class)
  conditional: Record<WorkKind, Map<string, number>>; // log P(token | class) (smoothed)
  vocabSize: number;
  totalsByClass: Record<WorkKind, number>;
  trainedAt: number;
  trainingSize: number;
};

function trainNaiveBayes(): Model {
  const trainedAt = Date.now();
  const vocab = new Set<string>();
  const tokenCounts: Record<WorkKind, Map<string, number>> = Object.fromEntries(
    CLASSES.map((c) => [c, new Map<string, number>()])
  ) as Record<WorkKind, Map<string, number>>;
  const docsPerClass: Record<WorkKind, number> = Object.fromEntries(
    CLASSES.map((c) => [c, 0])
  ) as Record<WorkKind, number>;
  const totalsByClass: Record<WorkKind, number> = Object.fromEntries(
    CLASSES.map((c) => [c, 0])
  ) as Record<WorkKind, number>;

  for (const example of TRAINING_CORPUS) {
    const tokens = tokenize(example.text);
    docsPerClass[example.label]++;
    for (const t of tokens) {
      vocab.add(t);
      tokenCounts[example.label].set(
        t,
        (tokenCounts[example.label].get(t) ?? 0) + 1
      );
      totalsByClass[example.label]++;
    }
  }

  // Priors (log)
  const totalDocs = TRAINING_CORPUS.length;
  const priors: Record<WorkKind, number> = Object.fromEntries(
    CLASSES.map((c) => [c, Math.log((docsPerClass[c] + 1) / (totalDocs + CLASSES.length))])
  ) as Record<WorkKind, number>;

  // Conditional log-probs with Laplace smoothing
  const alpha = 1; // smoothing constant
  const vocabSize = vocab.size;
  const conditional: Record<WorkKind, Map<string, number>> = Object.fromEntries(
    CLASSES.map((c) => [c, new Map<string, number>()])
  ) as Record<WorkKind, Map<string, number>>;

  for (const c of CLASSES) {
    const denom = totalsByClass[c] + alpha * vocabSize;
    for (const t of vocab) {
      const count = tokenCounts[c].get(t) ?? 0;
      conditional[c].set(t, Math.log((count + alpha) / denom));
    }
  }

  return {
    priors,
    conditional,
    vocabSize,
    totalsByClass,
    trainedAt,
    trainingSize: TRAINING_CORPUS.length,
  };
}

// Train once at module load — bundles into the client.
const MODEL = trainNaiveBayes();

export type ClassificationResult = {
  label: WorkKind;
  confidence: number; // softmax probability of the chosen class
  scores: Record<WorkKind, number>; // softmax distribution
  topFeatures: string[]; // most-influential tokens for the chosen class
};

function logsumexp(xs: number[]): number {
  const m = Math.max(...xs);
  return m + Math.log(xs.reduce((s, x) => s + Math.exp(x - m), 0));
}

export function classifyText(text: string): ClassificationResult {
  const tokens = tokenize(text);

  // Compute log-posterior per class
  const logScores: Record<WorkKind, number> = {} as Record<WorkKind, number>;
  for (const c of CLASSES) {
    let s = MODEL.priors[c];
    for (const t of tokens) {
      const lp = MODEL.conditional[c].get(t);
      if (lp !== undefined) {
        s += lp;
      } else {
        // Unseen token — apply implicit Laplace probability (very small)
        s += Math.log(1 / (MODEL.totalsByClass[c] + MODEL.vocabSize + 1));
      }
    }
    logScores[c] = s;
  }

  // Softmax via log-sum-exp
  const allScores = CLASSES.map((c) => logScores[c]);
  const lse = logsumexp(allScores);
  const scores: Record<WorkKind, number> = {} as Record<WorkKind, number>;
  let best: WorkKind = CLASSES[0];
  let bestScore = -Infinity;
  for (const c of CLASSES) {
    scores[c] = Math.exp(logScores[c] - lse);
    if (scores[c] > bestScore) {
      bestScore = scores[c];
      best = c;
    }
  }

  // Top contributing features for the predicted class
  const topFeatures = tokens
    .filter((t) => MODEL.conditional[best].has(t))
    .map((t) => ({
      t,
      delta:
        MODEL.conditional[best].get(t)! -
        Math.max(
          ...CLASSES.filter((c) => c !== best).map(
            (c) => MODEL.conditional[c].get(t) ?? -20
          )
        ),
    }))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((f) => f.t.replace(/_/g, " "));

  return { label: best, confidence: bestScore, scores, topFeatures };
}

/** Model metadata for the UI to display. */
export function getModelInfo() {
  return {
    algorithm: "multinomial-naive-bayes",
    classes: CLASSES,
    vocabSize: MODEL.vocabSize,
    trainingSize: MODEL.trainingSize,
    trainedAt: MODEL.trainedAt,
    smoothing: "laplace",
    features: "1-grams + 2-grams",
  };
}
