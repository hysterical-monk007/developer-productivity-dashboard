import { NextResponse } from "next/server";
import { getGithubToken, ghFetch, ghGraphQL, type GhUser } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchResult = { total_count: number };

type CalQuery = {
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalIssueContributions: number;
      contributionCalendar: {
        weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
      };
    };
  };
};

const QUERY = `query Stats($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      contributionCalendar {
        weeks {
          contributionDays { date contributionCount }
        }
      }
    }
  }
}`;

type DayPoint = { date: string; count: number };

function flattenDays(
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[]
): DayPoint[] {
  return weeks
    .flatMap((w) =>
      w.contributionDays.map((d) => ({
        date: d.date,
        count: d.contributionCount,
      }))
    )
    .filter((d) => new Date(d.date) <= new Date())
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sumLastN(days: DayPoint[], n: number): number {
  return days.slice(-n).reduce((s, d) => s + d.count, 0);
}

function computeCurrentStreak(days: DayPoint[]): number {
  // Walk from the latest day backward. Today can be zero (grace period
  // for "still alive but haven't pushed yet") — only break the streak when
  // we hit a zero day after seeing some non-zero days.
  let streak = 0;
  const reversed = [...days].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const d = reversed[i];
    if (d.count > 0) {
      streak++;
    } else if (i === 0) {
      // Today is zero — grant grace
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeLongestStreak(days: DayPoint[]): number {
  let best = 0;
  let current = 0;
  for (const d of days) {
    if (d.count > 0) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function computeMostActiveDayOfWeek(days: DayPoint[]): string {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) {
    totals[new Date(d.date).getDay()] += d.count;
  }
  const max = Math.max(...totals);
  if (max === 0) return "Wednesday";
  const idx = totals.indexOf(max);
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][idx];
}

export async function GET(req: Request) {
  const token = await getGithubToken(req);
  if (!token) {
    return NextResponse.json({ error: "not_linked" }, { status: 401 });
  }
  try {
    const me = await ghFetch<GhUser & { owned_private_repos?: number }>(
      token,
      "/user"
    );
    const login = me.login;

    const [openPRs, mergedPRs, openIssues, gql, repos] = await Promise.all([
      ghFetch<SearchResult>(
        token,
        `/search/issues?q=author%3A${login}+type%3Apr+is%3Aopen&per_page=1`
      ).catch(() => ({ total_count: 0 })),
      ghFetch<SearchResult>(
        token,
        `/search/issues?q=author%3A${login}+type%3Apr+is%3Amerged&per_page=1`
      ).catch(() => ({ total_count: 0 })),
      ghFetch<SearchResult>(
        token,
        `/search/issues?q=author%3A${login}+type%3Aissue+is%3Aopen&per_page=1`
      ).catch(() => ({ total_count: 0 })),
      ghGraphQL<CalQuery>(token, QUERY, { login }),
      ghFetch<unknown[]>(
        token,
        "/user/repos?per_page=100&affiliation=owner,collaborator,organization_member"
      ).catch(() => []),
    ]);

    const cc = gql.user.contributionsCollection;
    const days = flattenDays(cc.contributionCalendar.weeks);

    // Multi-window aggregates
    const last1 = sumLastN(days, 1);
    const last7 = sumLastN(days, 7);
    const last30 = sumLastN(days, 30);
    const last365 = sumLastN(days, 365);

    const currentStreak = computeCurrentStreak(days);
    const longestStreak = computeLongestStreak(days);
    const mostActiveDay = computeMostActiveDayOfWeek(days);

    const reposCount = Array.isArray(repos) ? repos.length : me.public_repos;

    const stats = {
      // New per-window breakdown so the UI can switch ranges without
      // re-querying GitHub.
      contributionsByWindow: {
        today: last1,
        last7d: last7,
        last30d: last30,
        lastYear: last365,
      },
      // Backward-compatible flat fields — engine + Hero still use these.
      commits:
        last30 ||
        cc.totalCommitContributions ||
        cc.totalCommitContributions,
      prsOpen: openPRs.total_count,
      prsMerged: mergedPRs.total_count,
      issuesOpen: openIssues.total_count,
      streak: currentStreak,
      longestStreak,
      activeRepos: reposCount,
      mostActiveDay,
      deltas: {
        commits: 0,
        prs: 0,
        issues: 0,
        streak: 0,
        repos: 0,
      },
    };

    console.log(`[github/stats] ${login}:`, {
      windows: stats.contributionsByWindow,
      currentStreak,
      longestStreak,
      reposCount,
    });

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "github_error",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 }
    );
  }
}
