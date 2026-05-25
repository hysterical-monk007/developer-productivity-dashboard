import { auth, HAS_OAUTH } from "@/auth";

export const GH_API = "https://api.github.com";
export const GH_GRAPHQL = "https://api.github.com/graphql";

/**
 * Resolve a GitHub access token from either:
 *   1) An `x-github-pat` request header (set by client when using PAT fallback)
 *   2) An OAuth session (NextAuth)
 *
 * Returns null when no credential is available.
 */
export async function getGithubToken(req: Request): Promise<string | null> {
  // PAT header takes precedence — it's an explicit user opt-in for that request
  const patHeader = req.headers.get("x-github-pat");
  if (patHeader && patHeader.length > 10) return patHeader;

  // Skip auth() entirely when OAuth isn't configured — calling auth() without
  // AUTH_SECRET prints a noisy error on every request.
  if (!HAS_OAUTH) return null;

  try {
    const session = await auth();
    const token = (session as unknown as { accessToken?: string } | null)
      ?.accessToken;
    if (token) return token;
  } catch {
    // Safety net for any other config edge case
  }
  return null;
}

export type GhUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
};

export type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  html_url: string;
};

export type GhEvent = {
  id: string;
  type: string;
  actor: { login: string; avatar_url: string };
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00ADD8",
  Python: "#FFD43B",
  Rust: "#dea584",
  Swift: "#F05138",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Ruby: "#701516",
  PHP: "#4F5D95",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Shell: "#89e051",
  HCL: "#844FBA",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

export function languageColor(lang: string | null): string {
  if (!lang) return "#94a3b8";
  return LANGUAGE_COLORS[lang] ?? "#94a3b8";
}

export async function ghFetch<T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GH_API}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pulse-dashboard",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GitHub ${res.status} on ${path}: ${body.slice(0, 200)}`
    );
  }
  return (await res.json()) as T;
}

export async function ghGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "pulse-dashboard",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub GraphQL ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: T; errors?: unknown[] };
  if (json.errors) {
    throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}
