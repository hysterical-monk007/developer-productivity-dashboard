/**
 * Dolly context payload — every piece of structured data the assistant might
 * need to answer "what have I been doing?" or "should I worry about anything?"
 *
 * Built client-side from the same data the dashboard widgets render, so
 * Dolly never sees anything the user can't see themselves.
 */

import { generateInsightsFromData, type EngineInput } from "@/lib/ml/insights-engine";
import {
  computeProductivityScore,
  normalizedEntropy,
  type ScoreOutput,
} from "@/lib/ml/scoring";
import { classifyText } from "@/lib/ml/classifier";

export type DollyContext = {
  user: {
    displayName: string;
    handle: string;
    bio?: string | null;
    linkedToGithub: boolean;
    role: string;
  };
  stats: {
    commits24h?: number;
    commits7d?: number;
    commits30d?: number;
    commitsYear?: number;
    prsOpen: number;
    prsMerged: number;
    issuesOpen: number;
    currentStreak: number;
    longestStreak: number;
    activeRepos: number;
    mostActiveDay?: string;
  };
  productivity: ScoreOutput;
  recentActivity: {
    title: string;
    repo: string;
    kind: string;
    workKind: string;
    when: string;
  }[];
  topRepos: { name: string; language?: string; commitsThisWeek: number }[];
  team: {
    totalMembers: number;
    rolesBreakdown: Record<string, number>;
  };
  mlSignals: {
    insightsTitles: string[];
    detectorsRun: number;
    workMixEntropy: number;
  };
  /** Optional: a timestamp so Dolly can speak in present tense. */
  generatedAt: string;
};

export type ContextBuildInput = {
  displayName: string;
  handle: string;
  bio?: string | null;
  linkedToGithub: boolean;
  role: string;
  stats: {
    commits24h?: number;
    commits7d?: number;
    commits30d?: number;
    commitsYear?: number;
    prsOpen: number;
    prsMerged: number;
    issuesOpen: number;
    currentStreak: number;
    longestStreak: number;
    activeRepos: number;
    mostActiveDay?: string;
  };
  recentActivity: {
    title: string;
    repo: string;
    kind: string;
    when: string;
  }[];
  topRepos: { name: string; language?: string; commitsThisWeek: number }[];
  team: {
    totalMembers: number;
    rolesBreakdown: Record<string, number>;
  };
  /** Daily commit counts, oldest → newest. Drives the insights engine. */
  commitsDaily: { iso: string; count: number }[];
};

export function buildDollyContext(input: ContextBuildInput): DollyContext {
  // Run the local ML pipeline so Dolly references the same numbers the
  // dashboard does.
  const workKindCounts: Record<string, number> = {
    feature: 0,
    bugfix: 0,
    refactor: 0,
    chore: 0,
    docs: 0,
    perf: 0,
    review: 0,
  };
  const classifiedActivity = input.recentActivity.map((a) => {
    const cls = classifyText(a.title);
    workKindCounts[cls.label] = (workKindCounts[cls.label] ?? 0) + 1;
    return { ...a, workKind: cls.label };
  });

  const engineInput: EngineInput = {
    commits: input.commitsDaily,
    workKindCounts: workKindCounts as EngineInput["workKindCounts"],
    prsOpen: input.stats.prsOpen,
    prsMerged: input.stats.prsMerged,
    issuesOpen: input.stats.issuesOpen,
    streakDays: input.stats.currentStreak,
    topRepo: input.topRepos[0]
      ? { name: input.topRepos[0].name, share: 0.4 }
      : undefined,
    mostActiveDay: input.stats.mostActiveDay,
  };
  const engineOutput = generateInsightsFromData(engineInput);

  const entropy = normalizedEntropy(Object.values(workKindCounts));

  const productivity = computeProductivityScore({
    commitsPerActiveDay:
      input.stats.commits30d && input.stats.commits30d > 0
        ? input.stats.commits30d / Math.max(1, input.stats.activeRepos)
        : 0,
    streakDays: input.stats.currentStreak,
    prsMerged30d: Math.min(input.stats.prsMerged, 60),
    reviewLatencyHours: 18, // placeholder — would come from PR-review timestamps
    issueCloseRate:
      input.stats.issuesOpen === 0
        ? 1
        : input.stats.prsMerged / (input.stats.issuesOpen + input.stats.prsMerged),
    workMixEntropy: entropy,
  });

  return {
    user: {
      displayName: input.displayName,
      handle: input.handle,
      bio: input.bio,
      linkedToGithub: input.linkedToGithub,
      role: input.role,
    },
    stats: input.stats,
    productivity,
    recentActivity: classifiedActivity.slice(0, 12),
    topRepos: input.topRepos.slice(0, 6),
    team: input.team,
    mlSignals: {
      insightsTitles: engineOutput.insights.map((i) => i.title),
      detectorsRun: engineOutput.metadata.detectorsRun,
      workMixEntropy: entropy,
    },
    generatedAt: new Date().toISOString(),
  };
}
