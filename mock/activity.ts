export type ActivityKind = "commit" | "pr_opened" | "pr_merged" | "issue_opened" | "issue_closed" | "review";

export type WorkKind = "feature" | "bugfix" | "refactor" | "chore" | "docs" | "perf" | "review";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  actor: { name: string; avatar: string; color: string };
  repo: string;
  title: string;
  meta?: string;
  timestamp: string; // ISO
  relative: string;
};

export type ClassifiedEvent = ActivityEvent & {
  workKind: WorkKind;
  classifierConfidence: number; // 0..1
};

// Lightweight rule-based classifier — stands in for an ML model. The dashboard
// surfaces the *output* as if it came from a trained classifier, with a
// confidence score derived from how unambiguous the signals are.
export function classifyEvent(event: ActivityEvent): ClassifiedEvent {
  const t = event.title.toLowerCase();

  // Reviews are pre-categorical
  if (event.kind === "review") {
    return { ...event, workKind: "review", classifierConfidence: 0.99 };
  }

  // Conventional-commit prefixes — high-confidence signals
  if (/^(feat|feature)[:(]/.test(t))
    return { ...event, workKind: "feature", classifierConfidence: 0.97 };
  if (/^(fix|bugfix)[:(]/.test(t))
    return { ...event, workKind: "bugfix", classifierConfidence: 0.97 };
  if (/^refactor[:(]/.test(t))
    return { ...event, workKind: "refactor", classifierConfidence: 0.96 };
  if (/^chore[:(]/.test(t))
    return { ...event, workKind: "chore", classifierConfidence: 0.95 };
  if (/^docs?[:(]/.test(t))
    return { ...event, workKind: "docs", classifierConfidence: 0.95 };
  if (/^perf[:(]/.test(t))
    return { ...event, workKind: "perf", classifierConfidence: 0.96 };
  if (/^ui[:(]/.test(t))
    return { ...event, workKind: "refactor", classifierConfidence: 0.86 };

  // Issue events default to bugfix-ish unless they read like investigations
  if (event.kind === "issue_opened" || event.kind === "issue_closed") {
    if (/\b(latency|p99|memory leak|spike|slow)\b/.test(t))
      return { ...event, workKind: "perf", classifierConfidence: 0.84 };
    return { ...event, workKind: "bugfix", classifierConfidence: 0.82 };
  }

  // Free-form titles — keyword heuristics
  if (/\b(add|introduce|provision|migrate|implement|scaffold)\b/.test(t))
    return { ...event, workKind: "feature", classifierConfidence: 0.78 };
  if (/\b(fix|resolve|handle|crash|broken)\b/.test(t))
    return { ...event, workKind: "bugfix", classifierConfidence: 0.81 };
  if (/\b(refactor|extract|tighten|cleanup|reorganize)\b/.test(t))
    return { ...event, workKind: "refactor", classifierConfidence: 0.79 };
  if (/\b(bump|upgrade|update.*to)\b/.test(t))
    return { ...event, workKind: "chore", classifierConfidence: 0.86 };

  // Fallback — moderate confidence
  return { ...event, workKind: "feature", classifierConfidence: 0.62 };
}

const actors = {
  alex: { name: "Alex Chen", avatar: "AC", color: "from-violet-500 to-fuchsia-500" },
  maya: { name: "Maya Patel", avatar: "MP", color: "from-emerald-500 to-teal-500" },
  jordan: { name: "Jordan Kim", avatar: "JK", color: "from-amber-500 to-orange-500" },
  rin: { name: "Rin Suzuki", avatar: "RS", color: "from-sky-500 to-blue-500" },
  diego: { name: "Diego Ortiz", avatar: "DO", color: "from-rose-500 to-pink-500" },
};

export const activity: ActivityEvent[] = [
  { id: "a1", kind: "pr_merged", actor: actors.alex, repo: "web-app", title: "Refactor billing card component", meta: "#1284 · +312 −189", timestamp: "2026-05-25T14:18:00Z", relative: "12m ago" },
  { id: "a2", kind: "commit", actor: actors.maya, repo: "payments-service", title: "Add retry logic to Stripe webhook handler", meta: "8a3f2c1", timestamp: "2026-05-25T13:42:00Z", relative: "48m ago" },
  { id: "a3", kind: "issue_opened", actor: actors.jordan, repo: "mobile-ios", title: "App crashes when opening invoice with no line items", meta: "#412", timestamp: "2026-05-25T13:05:00Z", relative: "1h ago" },
  { id: "a4", kind: "review", actor: actors.rin, repo: "api-gateway", title: "Reviewed: Add rate-limiting middleware", meta: "approved", timestamp: "2026-05-25T12:28:00Z", relative: "2h ago" },
  { id: "a5", kind: "pr_opened", actor: actors.diego, repo: "design-system", title: "feat: introduce new MetricCard primitive", meta: "#88", timestamp: "2026-05-25T11:50:00Z", relative: "2h ago" },
  { id: "a6", kind: "commit", actor: actors.alex, repo: "web-app", title: "ui: tighten dashboard grid spacing", meta: "f7b21de", timestamp: "2026-05-25T11:15:00Z", relative: "3h ago" },
  { id: "a7", kind: "issue_closed", actor: actors.maya, repo: "payments-service", title: "Failed payments not retrying after 24h window", meta: "#207", timestamp: "2026-05-25T10:33:00Z", relative: "4h ago" },
  { id: "a8", kind: "pr_merged", actor: actors.rin, repo: "infra-terraform", title: "Add staging cluster autoscaling", meta: "#54 · +201 −12", timestamp: "2026-05-25T09:48:00Z", relative: "5h ago" },
  { id: "a9", kind: "commit", actor: actors.alex, repo: "api-gateway", title: "fix: resolve race condition in cache layer", meta: "c19ab44", timestamp: "2026-05-25T09:12:00Z", relative: "5h ago" },
  { id: "a10", kind: "pr_opened", actor: actors.jordan, repo: "web-app", title: "feat: add contribution heatmap to profile page", meta: "#1287", timestamp: "2026-05-25T08:30:00Z", relative: "6h ago" },
  { id: "a11", kind: "review", actor: actors.alex, repo: "design-system", title: "Reviewed: Theme tokens migration v2", meta: "changes requested", timestamp: "2026-05-25T07:55:00Z", relative: "7h ago" },
  { id: "a12", kind: "commit", actor: actors.diego, repo: "design-system", title: "chore: bump radix-ui to 1.2.x across packages", meta: "9e34fa0", timestamp: "2026-05-25T07:20:00Z", relative: "7h ago" },
  { id: "a13", kind: "issue_opened", actor: actors.maya, repo: "api-gateway", title: "Investigate p99 latency spike on /v2/billing", meta: "#142", timestamp: "2026-05-25T06:45:00Z", relative: "8h ago" },
  { id: "a14", kind: "pr_merged", actor: actors.alex, repo: "payments-service", title: "Migrate from Stripe Sources to PaymentMethods", meta: "#322 · +540 −280", timestamp: "2026-05-24T23:18:00Z", relative: "16h ago" },
  { id: "a15", kind: "commit", actor: actors.rin, repo: "mobile-ios", title: "Add haptic feedback to checkout flow", meta: "5b2c910", timestamp: "2026-05-24T21:33:00Z", relative: "18h ago" },
  { id: "a16", kind: "issue_closed", actor: actors.jordan, repo: "web-app", title: "Dark mode toggle persists incorrectly across tabs", meta: "#1102", timestamp: "2026-05-24T20:14:00Z", relative: "19h ago" },
  { id: "a17", kind: "pr_opened", actor: actors.alex, repo: "infra-terraform", title: "Provision CloudFront for static assets", meta: "#55", timestamp: "2026-05-24T18:42:00Z", relative: "20h ago" },
  { id: "a18", kind: "commit", actor: actors.maya, repo: "payments-service", title: "Add metrics emission for failed charges", meta: "21abc83", timestamp: "2026-05-24T17:18:00Z", relative: "22h ago" },
  { id: "a19", kind: "review", actor: actors.diego, repo: "web-app", title: "Reviewed: Refactor billing card component", meta: "approved", timestamp: "2026-05-24T16:01:00Z", relative: "23h ago" },
  { id: "a20", kind: "pr_merged", actor: actors.maya, repo: "api-gateway", title: "Add caching layer for repository queries", meta: "#138 · +180 −45", timestamp: "2026-05-24T14:50:00Z", relative: "1d ago" },
  { id: "a21", kind: "commit", actor: actors.alex, repo: "web-app", title: "feat: scaffold AI insights panel", meta: "0a3b4e5", timestamp: "2026-05-24T13:22:00Z", relative: "1d ago" },
  { id: "a22", kind: "issue_opened", actor: actors.rin, repo: "design-system", title: "ScrollArea jitters on Safari 17", meta: "#42", timestamp: "2026-05-24T11:48:00Z", relative: "1d ago" },
  { id: "a23", kind: "pr_opened", actor: actors.maya, repo: "infra-terraform", title: "feat: add CI/CD pipeline for staging", meta: "#56", timestamp: "2026-05-24T10:30:00Z", relative: "1d ago" },
  { id: "a24", kind: "commit", actor: actors.jordan, repo: "mobile-ios", title: "fix: handle expired session tokens gracefully", meta: "7d8e2f3", timestamp: "2026-05-24T09:15:00Z", relative: "1d ago" },
  { id: "a25", kind: "pr_merged", actor: actors.diego, repo: "design-system", title: "feat: add new Tooltip primitive with arrow", meta: "#87 · +210 −34", timestamp: "2026-05-23T22:40:00Z", relative: "2d ago" },
  { id: "a26", kind: "commit", actor: actors.alex, repo: "payments-service", title: "refactor: extract webhook signature verification", meta: "ab4f102", timestamp: "2026-05-23T19:22:00Z", relative: "2d ago" },
  { id: "a27", kind: "issue_closed", actor: actors.rin, repo: "api-gateway", title: "Memory leak in subscription resolver", meta: "#129", timestamp: "2026-05-23T17:08:00Z", relative: "2d ago" },
  { id: "a28", kind: "pr_opened", actor: actors.alex, repo: "design-system", title: "feat: add Heatmap component", meta: "#89", timestamp: "2026-05-23T15:45:00Z", relative: "2d ago" },
  { id: "a29", kind: "review", actor: actors.maya, repo: "web-app", title: "Reviewed: AI insights panel scaffold", meta: "approved", timestamp: "2026-05-23T14:30:00Z", relative: "2d ago" },
  { id: "a30", kind: "commit", actor: actors.diego, repo: "web-app", title: "ui: improve loading skeletons across dashboard", meta: "3f8c2a1", timestamp: "2026-05-23T11:20:00Z", relative: "2d ago" },
  { id: "a31", kind: "pr_merged", actor: actors.jordan, repo: "payments-service", title: "fix: handle Stripe Idempotency-Key collisions", meta: "#321 · +89 −22", timestamp: "2026-05-23T09:10:00Z", relative: "2d ago" },
];
