"use client";

import { useCallback, useEffect, useState } from "react";
import { team as seedTeam } from "@/mock/team";

export type Role = "owner" | "admin" | "editor" | "viewer";

export const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Full control. Can do everything, including removing other admins.",
  admin: "Can invite/remove members, change settings, regenerate insights.",
  editor: "Can regenerate insights and edit settings, but not manage the team.",
  viewer: "Read-only access — can view the dashboard but not change anything.",
};

export type PresenceStatus = "online" | "away" | "offline";

export type TeamMember = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  avatarColor: string;
  role: Role;
  // Optional GitHub-derived
  bio?: string;
  /** Real GitHub avatar URL when the user was added via the live lookup. */
  avatarUrl?: string;
  /** True when this member was confirmed to exist on GitHub. */
  githubVerified?: boolean;
  // Derived/cached
  commits: number;
  prsMerged: number;
  reviewsGiven: number;
  delta: number;
  joinedAt: string;
};

const STORE_KEY = "devdash_team";
const EVENT = "devdash:team";

// One-time seed from the existing leaderboard mock so the dashboard's
// leaderboard and the team page show the same humans.
function defaultTeam(): TeamMember[] {
  const now = new Date().toISOString();
  return seedTeam.map((m, i) => ({
    id: m.id,
    name: m.name,
    username: m.username,
    avatar: m.avatar,
    avatarColor: m.avatarColor,
    role:
      i === 0 ? "owner" : i === 1 ? "admin" : i === 2 ? "editor" : "viewer",
    bio: m.role,
    commits: m.commits,
    prsMerged: m.prsMerged,
    reviewsGiven: m.reviewsGiven,
    delta: m.delta,
    joinedAt: now,
  }));
}

function loadFromStorage(): TeamMember[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeamMember[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(team: TeamMember[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(team));
  window.dispatchEvent(new Event(EVENT));
}

// ── Public API (works inside React via useTeam, or imperatively) ───────────

export function getTeamSync(): TeamMember[] {
  return loadFromStorage() ?? defaultTeam();
}

export function inviteMember(input: {
  name: string;
  username: string;
  role: Role;
  avatarUrl?: string;
  bio?: string;
  githubVerified?: boolean;
}): TeamMember {
  const team = getTeamSync();
  // Generate a stable id from the username
  const id = input.username.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const initials =
    input.name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || input.username.slice(0, 2).toUpperCase();

  const palette = [
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-coral-500",
    "from-amber-500 to-orange-500",
    "from-sky-500 to-blue-500",
    "from-fuchsia-500 to-pink-500",
    "from-violet-500 to-indigo-500",
    "from-lime-500 to-emerald-500",
    "from-cyan-500 to-sky-500",
  ];
  const avatarColor = palette[team.length % palette.length];

  const newMember: TeamMember = {
    id: team.some((m) => m.id === id) ? `${id}-${Date.now()}` : id,
    name: input.name,
    username: input.username.replace(/^@/, ""),
    avatar: initials,
    avatarColor,
    role: input.role,
    avatarUrl: input.avatarUrl,
    bio: input.bio,
    githubVerified: input.githubVerified,
    commits: 0,
    prsMerged: 0,
    reviewsGiven: 0,
    delta: 0,
    joinedAt: new Date().toISOString(),
  };
  const next = [...team, newMember];
  saveToStorage(next);
  return newMember;
}

export function changeRole(id: string, role: Role) {
  const team = getTeamSync();
  // Never demote the only owner
  if (role !== "owner") {
    const owners = team.filter((m) => m.role === "owner");
    if (owners.length === 1 && owners[0].id === id) return;
  }
  const next = team.map((m) => (m.id === id ? { ...m, role } : m));
  saveToStorage(next);
}

export function removeMember(id: string) {
  const team = getTeamSync();
  // Don't allow removing the only owner
  const target = team.find((m) => m.id === id);
  if (target?.role === "owner") {
    const owners = team.filter((m) => m.role === "owner");
    if (owners.length === 1) return;
  }
  saveToStorage(team.filter((m) => m.id !== id));
}

export function resetTeam() {
  saveToStorage(defaultTeam());
}

/**
 * Claim the owner slot for the currently logged-in GitHub user.
 *
 * Replaces whoever currently holds the `owner` role (initially the seeded
 * "Alex Chen") with the real profile of the person using the dashboard.
 * Keeps their role + commit stats so the leaderboard doesn't lose history.
 *
 * Idempotent — if the owner already matches the GitHub login, this is a
 * no-op. Safe to call on every GitHub-link event.
 */
export function claimSelf(profile: {
  login: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
}) {
  const team = getTeamSync();
  const cleanLogin = profile.login.replace(/^@/, "");
  // Already claimed? — nothing to do.
  const owner = team.find((m) => m.role === "owner");
  if (owner && owner.username === cleanLogin && owner.githubVerified) {
    return;
  }

  // Pick the slot to replace: the existing owner if one exists, otherwise
  // the first member. We preserve their stats + role + joinedAt.
  const targetIndex = team.findIndex((m) => m.role === "owner");
  const slot = targetIndex >= 0 ? team[targetIndex] : team[0];
  if (!slot) {
    // Empty team — just insert the user as owner.
    const newId = cleanLogin.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const initials =
      profile.name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || cleanLogin.slice(0, 2).toUpperCase();
    saveToStorage([
      {
        id: newId,
        name: profile.name,
        username: cleanLogin,
        avatar: initials,
        avatarColor: "from-emerald-500 to-teal-500",
        role: "owner",
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        githubVerified: true,
        commits: 0,
        prsMerged: 0,
        reviewsGiven: 0,
        delta: 0,
        joinedAt: new Date().toISOString(),
      },
    ]);
    return;
  }

  const initials =
    profile.name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || cleanLogin.slice(0, 2).toUpperCase();
  const newId = cleanLogin.toLowerCase().replace(/[^a-z0-9]/g, "-");
  // Ensure id uniqueness — if another non-self member already has this id,
  // keep our slot's old id rather than colliding.
  const idConflicts = team.some(
    (m, i) => i !== (targetIndex >= 0 ? targetIndex : 0) && m.id === newId
  );
  const finalId = idConflicts ? slot.id : newId;

  const updated: TeamMember = {
    ...slot,
    id: finalId,
    name: profile.name,
    username: cleanLogin,
    avatar: initials,
    avatarUrl: profile.avatarUrl ?? undefined,
    bio: profile.bio ?? slot.bio,
    githubVerified: true,
    // Force role to owner even if the slot was something else
    role: "owner",
  };

  const next = team.map((m, i) =>
    i === (targetIndex >= 0 ? targetIndex : 0) ? updated : m
  );
  saveToStorage(next);
}

/** React hook — subscribes to the local store and re-renders on changes. */
export function useTeam(): {
  team: TeamMember[];
  invite: typeof inviteMember;
  changeRole: typeof changeRole;
  remove: typeof removeMember;
  reset: typeof resetTeam;
} {
  const [team, setTeam] = useState<TeamMember[]>(() =>
    typeof window !== "undefined" ? getTeamSync() : defaultTeam()
  );

  useEffect(() => {
    const sync = () => setTeam(getTeamSync());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const invite = useCallback(
    (input: Parameters<typeof inviteMember>[0]) => inviteMember(input),
    []
  );
  const cr = useCallback((id: string, role: Role) => changeRole(id, role), []);
  const rm = useCallback((id: string) => removeMember(id), []);
  const reset = useCallback(() => resetTeam(), []);

  return { team, invite, changeRole: cr, remove: rm, reset };
}

/**
 * Convenience: the "current user" within the team. Resolves to whichever
 * member holds the `owner` role (auto-claimed by `claimSelf` once GitHub
 * is linked). Falls back to the first member if there's no owner.
 */
export function useCurrentMember(): TeamMember | null {
  const { team } = useTeam();
  return team.find((m) => m.role === "owner") ?? team[0] ?? null;
}
