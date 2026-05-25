import { NextResponse } from "next/server";
import { getGithubToken, ghFetch, type GhUser } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = await getGithubToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "not_linked" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  try {
    const user = await ghFetch<GhUser>(token, "/user");
    return NextResponse.json(
      {
        login: user.login,
        name: user.name ?? user.login,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        company: user.company,
        location: user.location,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "github_error", message: err instanceof Error ? err.message : "unknown" },
      { status: 502 }
    );
  }
}
