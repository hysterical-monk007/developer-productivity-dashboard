"use client";

import { ROLE_RANK, type Role } from "./team-store";

/**
 * Permission catalog. Each action lists the *minimum* role required.
 * Higher-ranked roles inherit lower roles' permissions.
 */
export const PERMISSIONS = {
  view_dashboard: "viewer",
  toggle_theme: "viewer",
  change_notifications: "viewer",

  regenerate_insights: "editor",
  edit_profile: "editor",

  manage_team: "admin",
  invite_member: "admin",
  change_role: "admin",
  connect_github: "admin",
  disconnect_github: "admin",

  remove_owner: "owner",
  delete_workspace: "owner",
} as const satisfies Record<string, Role>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[PERMISSIONS[permission]];
}

/** What's the lowest role that satisfies a given permission? Useful for tooltips. */
export function minRoleFor(permission: Permission): Role {
  return PERMISSIONS[permission];
}
