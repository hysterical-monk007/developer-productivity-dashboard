import { NextResponse } from "next/server";
import { getGithubToken, ghFetch, type GhUser } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchCommitsResponse = {
  total_count: number;
  items: {
    sha: string;
    commit: {
      message: string;
      author: { date: string };
    };
    html_url: string;
    repository: {
      name: string;
      full_name: string;
      html_url: string;
    };
  }[];
};

/**
 * Fetches commits authored by the logged-in user on a specific date.
 *
 * Uses the GitHub search/commits API:
 *   GET /search/commits?q=author:LOGIN+author-date:YYYY-MM-DD
 *
 * Note: search/commits returns at most 100 results per page. For a single
 * day that's almost always enough. The endpoint also needs the special
 * Accept header for the preview (now standard).
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

  try {
    const me = await ghFetch<GhUser>(token, "/user");
    const q = `author:${me.login}+author-date:${date}`;
    // sort=author-date desc so latest commit of the day is first
    const search = await ghFetch<SearchCommitsResponse>(
      token,
      `/search/commits?q=${encodeURIComponent(q)}&sort=author-date&order=desc&per_page=50`
    );

    const commits = search.items.map((c) => {
      const firstLine = c.commit.message.split("\n")[0];
      return {
        sha: c.sha.slice(0, 7),
        message: firstLine,
        repo: c.repository.name,
        repoFullName: c.repository.full_name,
        time: c.commit.author.date,
        url: c.html_url,
      };
    });

    // Aggregate per-repo for the modal summary
    const perRepo = new Map<string, number>();
    for (const c of commits) {
      perRepo.set(c.repo, (perRepo.get(c.repo) ?? 0) + 1);
    }
    const reposSummary = Array.from(perRepo.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      {
        date,
        totalCommits: search.total_count,
        commits,
        reposSummary,
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
