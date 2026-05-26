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
    (input: { name: string; username: string; role: Role }) =>
      inviteMember(input),
    []
  );
  const cr = useCallback((id: string, role: Role) => changeRole(id, role), []);
  const rm = useCallback((id: string) => removeMember(id), []);
  const reset = useCallback(() => resetTeam(), []);

  return { team, invite, changeRole: cr, remove: rm, reset };
}

/**
 * Convenience: the "current user" within the team. For the demo this is
 * always whoever owns this browser — by default the seeded owner.
 * Could later be wired to the GitHub-linked identity.
 */
export function useCurrentMember(): TeamMember | null {
  const { team } = useTeam();
  return team.find((m) => m.role === "owner") ?? team[0] ?? null;
}
