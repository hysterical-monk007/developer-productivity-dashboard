"use client";

import { useEffect } from "react";
import { useGithub } from "@/lib/use-github";
import { claimSelf } from "@/lib/team-store";

/**
 * Mount this once near the root of any authenticated page. When the user's
 * GitHub profile becomes available, it claims the owner slot in the team
 * store so the logged-in user appears as the team owner (with their real
 * avatar + name) instead of the seeded "Alex Chen" mock.
 *
 * Renders nothing — pure side-effect component.
 */
export function GithubTeamAnchor() {
  const { linked, profile } = useGithub();

  useEffect(() => {
    if (!linked || !profile) return;
    claimSelf({
      login: profile.login,
      name: profile.name || profile.login,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio ?? undefined,
    });
  }, [linked, profile]);

  return null;
}
