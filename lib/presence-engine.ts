"use client";

import { useEffect, useState } from "react";
import type { PresenceStatus } from "./team-store";

/**
 * Presence simulator — assigns each teammate a status (online/away/offline)
 * that cycles slowly over time. Deterministic per id so the same teammate
 * has the same "personality": some are always online, some flicker more.
 *
 * If we ever wire a real backend (Pusher/Supabase Realtime/Liveblocks), we
 * swap this implementation while keeping the hook shape identical.
 */

export type Presence = {
  status: PresenceStatus;
  isTyping: boolean;
  lastSeen: string;
};

// Stable hash of a string to a small int — keeps each teammate's presence
// cycle consistent across renders without any persistence.
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const STATUSES: PresenceStatus[] = ["online", "away", "offline"];

/**
 * Pure function: given an id and a clock tick, compute the current presence.
 * Each member has a personalized period derived from their id, so the
 * dashboard feels alive without ever calling out to a network.
 */
function computePresence(id: string, tick: number): Presence {
  const h = hash(id);
  const period = 25 + (h % 35); // seconds per cycle
  const offset = h % period;
  const t = (tick + offset) % period;

  // Most of each cycle is "online"; small slices are away/offline.
  let status: PresenceStatus;
  if (t < period * 0.6) status = "online";
  else if (t < period * 0.85) status = "away";
  else status = "offline";

  // Typing fires for ~3 seconds every 30-ish seconds, only when online
  const typingPeriod = 30 + (h % 20);
  const typingT = (tick + (h % typingPeriod)) % typingPeriod;
  const isTyping = status === "online" && typingT < 3;

  // "Last seen" is faked from the tick when status would have been online.
  const minutesAgo = status === "online" ? 0 : Math.max(1, (period - t) | 0);
  const lastSeen = `${minutesAgo}m`;

  return { status, isTyping, lastSeen };
}

/**
 * Hook — returns a map of id -> Presence and refreshes once per second.
 * Components that need presence read from this map.
 */
export function usePresence(ids: string[]): Record<string, Presence> {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const map: Record<string, Presence> = {};
  for (const id of ids) {
    map[id] = computePresence(id, tick);
  }
  return map;
}

/** One-off (non-reactive) presence for a single id. */
export function getPresence(id: string): Presence {
  return computePresence(id, Math.floor(Date.now() / 1000));
}
