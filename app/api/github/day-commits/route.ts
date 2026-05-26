import { NextResponse } from "next/server";
import { getGithubToken, ghFetch, type GhUser, type GhRepo } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RepoCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { date: string; name?: string };
  };
};

/**
 * Fetch commits authored by the logged-in user on a given day.
 *
 * GitHub's /search/commits endpoint no longer accepts qualifier-only queries
 * (it returns 422 "Search text is required"). Instead we fan out across the
 * user's repos and call /repos/{full_name}/commits per repo with the
 * author + since + until filters.
 *
 * We only query repos whose pushed_at is on or after the requested day —
 * a repo that wasn't pushed since then can't have a commit dated that day.
 * That keeps us under the 100-ish-repo ceiling for any reasonable user.
 *
 * Parallel requests. Failures per-repo are swallowed so one bad repo doesn't
 * kill the whole response.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "invalid_date", message: "date must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const token = await getGithubToken(req);
  if (!token) {
    return NextResponse.json({ error: "not_linked" }, { status: 401 });
  }

  const sinceIso = `${date}T00:00:00Z`;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const untilIso = next.toISOString();

  try {
    const me = await ghFetch<GhUser>(token, "/user");

    const repos = await ghFetch<GhRepo[]>(
      token,
      "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member"
    );

    // Only consider repos pushed on or after the requested day.
    const dayStart = new Date(sinceIso).getTime();
    const candidates = repos.filter(
      (r) => new Date(r.pushed_at).getTime() >= dayStart
    );

    const results = await Promise.all(
      candidates.map(async (r) => {
        try {
          const commits = await ghFetch<RepoCommit[]>(
            token,
            `/repos/${r.full_name}/commits?author=${encodeURIComponent(
              me.login
            )}&since=${encodeURIComponent(sinceIso)}&until=${encodeURIComponent(
              untilIso
            )}&per_page=50`
          );
          return commits.map((c) => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split("\n")[0],
            repo: r.name,
            repoFullName: r.full_name,
            time: c.commit.author.date,
            url: c.html_url,
          }));
        } catch {
          return [];
        }
      })
    );

    const commits = results
      .flat()
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const perRepo = new Map<string, number>();
    for (const c of commits) {
      perRepo.set(c.repo, (perRepo.get(c.repo) ?? 0) + 1);
    }
    const reposSummary = Array.from(perRepo.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    console.log(
      `[github/day-commits] ${date}: ${commits.length} commits across ${reposSummary.length} repos (scanned ${candidates.length}/${repos.length})`
    );

    return NextResponse.json(
      {
        date,
        totalCommits: commits.length,
        commits,
        reposSummary,
        scanned: candidates.length,
        totalReposChecked: repos.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
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
