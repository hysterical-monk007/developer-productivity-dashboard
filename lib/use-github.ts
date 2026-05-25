"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut as nextAuthSignOut } from "next-auth/react";

const PAT_KEY = "devdash_github_pat";
const PROFILE_KEY = "devdash_github_profile";

export type GithubProfile = {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  following: number;
};

export type GithubLink = {
  linked: boolean;
  source: "pat" | "oauth" | null;
  profile: GithubProfile | null;
  loading: boolean;
  error: string | null;
};

const EVENT = "devdash:github";

function readStoredProfile(): GithubProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GithubProfile;
  } catch {
    return null;
  }
}

function getStoredPat(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PAT_KEY);
}

export function getGithubFetchHeaders(): HeadersInit {
  const pat = getStoredPat();
  if (pat) return { "x-github-pat": pat };
  return {};
}

export function useGithub(): GithubLink & {
  connectPat: (pat: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<GithubLink>({
    linked: false,
    source: null,
    profile: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/github/me", {
        method: "GET",
        headers: getGithubFetchHeaders(),
        cache: "no-store",
      });
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(PROFILE_KEY);
        }
        setState({
          linked: false,
          source: null,
          profile: null,
          loading: false,
          error: null,
        });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState((s) => ({
          ...s,
          loading: false,
          error: body.message ?? `GitHub returned ${res.status}`,
        }));
        return;
      }
      const profile = (await res.json()) as GithubProfile;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      }
      const source: "pat" | "oauth" = getStoredPat() ? "pat" : "oauth";
      setState({
        linked: true,
        source,
        profile,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Network error",
      }));
    }
  }, []);

  useEffect(() => {
    // Hydrate optimistically from localStorage to avoid flash
    const stored = readStoredProfile();
    if (stored) {
      const source: "pat" | "oauth" = getStoredPat() ? "pat" : "oauth";
      setState({
        linked: true,
        source,
        profile: stored,
        loading: true,
        error: null,
      });
    }
    refresh();

    const onEvt = () => refresh();
    window.addEventListener(EVENT, onEvt);
    window.addEventListener("storage", onEvt);
    return () => {
      window.removeEventListener(EVENT, onEvt);
      window.removeEventListener("storage", onEvt);
    };
  }, [refresh]);

  const connectPat = useCallback(
    async (pat: string): Promise<boolean> => {
      if (typeof window === "undefined") return false;
      window.localStorage.setItem(PAT_KEY, pat.trim());
      window.dispatchEvent(new Event(EVENT));
      await refresh();
      // Check final state via a fresh fetch result
      const probe = await fetch("/api/github/me", {
        headers: { "x-github-pat": pat.trim() },
        cache: "no-store",
      });
      if (!probe.ok) {
        window.localStorage.removeItem(PAT_KEY);
        window.localStorage.removeItem(PROFILE_KEY);
        window.dispatchEvent(new Event(EVENT));
        return false;
      }
      return true;
    },
    [refresh]
  );

  const disconnect = useCallback(async () => {
    if (typeof window === "undefined") return;
    // Clear local caches first so the UI flips immediately
    const wasOAuth = !window.localStorage.getItem(PAT_KEY);
    window.localStorage.removeItem(PAT_KEY);
    window.localStorage.removeItem(PROFILE_KEY);
    setState({
      linked: false,
      source: null,
      profile: null,
      loading: false,
      error: null,
    });
    window.dispatchEvent(new Event(EVENT));

    // For OAuth sessions, the NextAuth session cookie is still set on the
    // server. Without clearing it, the next /api/github/me call would
    // succeed again and re-link the user. signOut() POSTs to NextAuth and
    // clears the cookie.
    if (wasOAuth) {
      try {
        await nextAuthSignOut({ redirect: false });
      } catch {
        // Best-effort: even if signOut fails, local state is already cleared
      }
    }
  }, []);

  return { ...state, connectPat, disconnect, refresh };
}
