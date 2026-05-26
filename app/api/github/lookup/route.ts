import { NextResponse } from "next/server";
import { getGithubToken, GH_API } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GhUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
};

/**
 * Look up any public GitHub user by username.
 *
 * Uses the caller's linked token (OAuth or PAT) if available — 5000 req/hr.
 * Falls back to unauthenticated requests for users who haven't linked GitHub
 * yet — 60 req/hr, which is plenty for typing-debounced lookups.
 *
 * Returns:
 *   200 { login, name, avatarUrl, bio, ... }
 *   404 { error: "not_found" }   when the username doesn't exist on GitHub
 *   429 { error: "rate_limited" } when we hit the unauthenticated limit
 *   502 { error: "github_error" } for any other GitHub failure
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const usernameRaw = url.searchParams.get("username") ?? "";
  const username = usernameRaw.trim().replace(/^@/, "");

  // GitHub usernames: alphanumeric + hyphens, 1-39 chars, no leading hyphen
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(username)) {
    return NextResponse.json(
      { error: "invalid_username" },
      { status: 400 }
    );
  }

  const token = await getGithubToken(req);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pulse-dashboard",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${GH_API}/users/${encodeURIComponent(username)}`, {
      headers,
      cache: "no-store",
    });

    if (res.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (res.status === 403) {
      // Likely rate-limited (most common 403 from /users)
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "github_error", status: res.status },
        { status: 502 }
      );
    }

    const u = (await res.json()) as GhUser;
    return NextResponse.json(
      {
        login: u.login,
        name: u.name ?? u.login,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        company: u.company,
        location: u.location,
        publicRepos: u.public_repos,
        followers: u.followers,
        following: u.following,
        url: u.html_url,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
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
