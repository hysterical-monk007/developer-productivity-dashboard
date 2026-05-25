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

function computeStreak(
  weeks: { contributionDays: { date: string; contributionCount: number }[] }[]
): number {
  // Flatten and reverse so latest day is first
  const days = weeks
    .flatMap((w) => w.contributionDays)
    .filter((d) => new Date(d.date) <= new Date())
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  let streak = 0;
  for (const d of days) {
    if (d.contributionCount > 0) streak++;
    else if (streak > 0) break;
    // If we haven't found any non-zero day yet and we're at "today",
    // allow today to be zero (streak might still be alive — count from yesterday)
    else if (streak === 0 && days.indexOf(d) === 0) continue;
    else break;
  }
  return streak;
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

    // Total *activity* over the last year — commits, PRs, reviews, issues.
    // More meaningful than totalCommitContributions for sparse accounts.
    const totalActivity =
      cc.totalCommitContributions +
      cc.totalPullRequestContributions +
      cc.totalPullRequestReviewContributions +
      cc.totalIssueContributions;

    const streak = computeStreak(cc.contributionCalendar.weeks);

    // Active repos: prefer the actual list count over me.public_repos
    // (which excludes private + collaborator repos).
    const reposCount = Array.isArray(repos)
      ? repos.length
      : me.public_repos;

    const stats = {
      commits: totalActivity || cc.totalCommitContributions,
      prsOpen: openPRs.total_count,
      prsMerged: mergedPRs.total_count,
      issuesOpen: openIssues.total_count,
      streak,
      activeRepos: reposCount,
      // No historical baseline yet — keep deltas neutral
      deltas: {
        commits: 0,
        prs: 0,
        issues: 0,
        streak: 0,
        repos: 0,
      },
    };

    console.log(`[github/stats] ${login}:`, stats);

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
