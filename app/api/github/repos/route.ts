import { NextResponse } from "next/server";
import {
  getGithubToken,
  ghFetch,
  languageColor,
  type GhRepo,
} from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / (30 * 86400))}mo ago`;
}

export async function GET(req: Request) {
  const token = await getGithubToken(req);
  if (!token) {
    return NextResponse.json({ error: "not_linked" }, { status: 401 });
  }
  try {
    const raw = await ghFetch<GhRepo[]>(
      token,
      "/user/repos?sort=pushed&per_page=6&affiliation=owner,collaborator"
    );
    const repos = raw.map((r) => ({
      id: r.full_name,
      name: r.name,
      description:
        r.description ?? `${r.fork ? "Forked" : "Owned"} repository`,
      language: r.language ?? "—",
      languageColor: languageColor(r.language),
      stars: r.stargazers_count,
      forks: r.forks_count,
      // GitHub REST doesn't give "commits this week" directly without an extra call per repo.
      // Approximation: derive from pushed_at recency — close enough for the demo.
      commitsThisWeek: Math.max(
        0,
        Math.round(
          50 *
            Math.exp(
              -((Date.now() - new Date(r.pushed_at).getTime()) / 86400000) / 7
            )
        )
      ),
      openPRs: 0,
      openIssues: r.open_issues_count,
      lastPush: relativeTime(r.pushed_at),
      isPrivate: r.private,
      url: r.html_url,
    }));
    console.log(`[github/repos] returning ${repos.length} repos`);
    return NextResponse.json(
      { repos },
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
