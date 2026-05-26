"use client";

import { useCallback, useEffect, useState } from "react";

export type ThreadKind = "dm" | "group";

export type ChatMessage = {
  id: string;
  authorId: string; // matches TeamMember.id
  text: string;
  at: string; // ISO
};

export type ChatThread = {
  id: string;
  kind: ThreadKind;
  // For DMs: [meId, otherId]. For groups: [meId, ...memberIds]
  memberIds: string[];
  // Group threads have a name; DMs are titled by the other member's name
  name?: string;
  messages: ChatMessage[];
  unread: number;
  createdAt: string;
};

const STORE_KEY = "devdash_chat";
const EVENT = "devdash:chat";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(threads: ChatThread[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(threads));
  window.dispatchEvent(new Event(EVENT));
}

// ── Seed a few interesting threads on first open so the UI isn't empty ───
function seedThreads(meId: string, otherIds: string[]): ChatThread[] {
  const now = new Date();
  const minsAgo = (m: number) =>
    new Date(now.getTime() - m * 60 * 1000).toISOString();

  const threads: ChatThread[] = [];

  if (otherIds[0]) {
    threads.push({
      id: uid("t"),
      kind: "dm",
      memberIds: [meId, otherIds[0]],
      messages: [
        {
          id: uid("m"),
          authorId: otherIds[0],
          text: "hey — got a sec to look at PR #322?",
          at: minsAgo(45),
        },
        {
          id: uid("m"),
          authorId: meId,
          text: "yeah just rebasing now — I'll comment in ~10",
          at: minsAgo(43),
        },
        {
          id: uid("m"),
          authorId: otherIds[0],
          text: "🙏 the retry logic is the tricky part",
          at: minsAgo(42),
        },
      ],
      unread: 1,
      createdAt: minsAgo(45),
    });
  }

  if (otherIds[1]) {
    threads.push({
      id: uid("t"),
      kind: "dm",
      memberIds: [meId, otherIds[1]],
      messages: [
        {
          id: uid("m"),
          authorId: otherIds[1],
          text: "the heatmap colors look so much better now btw",
          at: minsAgo(120),
        },
      ],
      unread: 0,
      createdAt: minsAgo(120),
    });
  }

  if (otherIds.length >= 2) {
    threads.push({
      id: uid("t"),
      kind: "group",
      name: "Engineering",
      memberIds: [meId, ...otherIds.slice(0, 4)],
      messages: [
        {
          id: uid("m"),
          authorId: otherIds[0],
          text: "standup in 5 — any blockers?",
          at: minsAgo(15),
        },
        {
          id: uid("m"),
          authorId: otherIds[1],
          text: "none on my side, just shipping the AI insights polish",
          at: minsAgo(14),
        },
        {
          id: uid("m"),
          authorId: otherIds[2] ?? otherIds[0],
          text: "I'm blocked on the api-gateway p99 ticket, can someone pair?",
          at: minsAgo(13),
        },
      ],
      unread: 2,
      createdAt: minsAgo(60 * 24),
    });
  }

  if (otherIds.length >= 3) {
    threads.push({
      id: uid("t"),
      kind: "group",
      name: "Design crit",
      memberIds: [meId, otherIds[2], otherIds[3] ?? otherIds[0]],
      messages: [
        {
          id: uid("m"),
          authorId: otherIds[2],
          text: "what do we think about the aurora bg performance on M1?",
          at: minsAgo(180),
        },
      ],
      unread: 0,
      createdAt: minsAgo(60 * 48),
    });
  }

  return threads;
}

// ── Auto-reply simulator ────────────────────────────────────────────────────
// After the user sends a message, schedule a believable reply from another
// member of the thread. The text is canned but contextual (replies pull from
// a pool with a slight match against the user's message).

const REPLY_POOL: { keywords: string[]; reply: string }[] = [
  { keywords: ["pr", "review"], reply: "on it — give me 5 min" },
  { keywords: ["bug", "fix", "crash"], reply: "good catch, will reproduce locally" },
  { keywords: ["deploy", "ship"], reply: "let's wait for the CI green light first" },
  { keywords: ["meeting", "sync", "standup"], reply: "👍 see you there" },
  { keywords: ["thanks", "ty", "appreciate"], reply: "anytime!" },
  { keywords: ["help", "stuck", "blocked"], reply: "happy to pair — DM me when ready" },
  { keywords: ["question", "wondering"], reply: "interesting — let me think" },
  { keywords: ["ai", "ml", "model"], reply: "the new insights engine is wild btw" },
  { keywords: ["github", "repo"], reply: "checked the repo this morning, looks clean" },
];

const FALLBACK_REPLIES = [
  "got it 👍",
  "makes sense",
  "let me think about that",
  "agree",
  "ship it",
  "let's discuss in standup",
  "good point",
  "✨",
];

function pickReply(text: string): string {
  const lower = text.toLowerCase();
  const match = REPLY_POOL.find((r) =>
    r.keywords.some((k) => lower.includes(k))
  );
  if (match) return match.reply;
  return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
}

// ── Public API ──────────────────────────────────────────────────────────────

export function ensureSeeded(meId: string, otherIds: string[]) {
  const existing = loadFromStorage();
  if (existing.length === 0 && otherIds.length > 0) {
    saveToStorage(seedThreads(meId, otherIds));
  }
}

export function sendMessage(threadId: string, authorId: string, text: string) {
  if (!text.trim()) return;
  const threads = loadFromStorage();
  const next = threads.map((t) =>
    t.id === threadId
      ? {
          ...t,
          messages: [
            ...t.messages,
            { id: uid("m"), authorId, text: text.trim(), at: nowIso() },
          ],
        }
      : t
  );
  saveToStorage(next);

  // Schedule an auto-reply 1.5-4 seconds later from a random other member
  const thread = next.find((t) => t.id === threadId);
  if (!thread) return;
  const others = thread.memberIds.filter((id) => id !== authorId);
  if (others.length === 0) return;
  const replier = others[Math.floor(Math.random() * others.length)];
  const delay = 1500 + Math.random() * 2500;

  setTimeout(() => {
    const threadsNow = loadFromStorage();
    const updated = threadsNow.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: [
              ...t.messages,
              {
                id: uid("m"),
                authorId: replier,
                text: pickReply(text),
                at: nowIso(),
              },
            ],
            unread: t.unread + 1,
          }
        : t
    );
    saveToStorage(updated);
  }, delay);
}

export function markThreadRead(threadId: string) {
  const threads = loadFromStorage();
  const next = threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t));
  saveToStorage(next);
}

export function createDM(meId: string, otherId: string): string {
  const threads = loadFromStorage();
  // Find existing DM if any
  const existing = threads.find(
    (t) =>
      t.kind === "dm" &&
      t.memberIds.length === 2 &&
      t.memberIds.includes(meId) &&
      t.memberIds.includes(otherId)
  );
  if (existing) return existing.id;
  const id = uid("t");
  const next: ChatThread[] = [
    ...threads,
    {
      id,
      kind: "dm",
      memberIds: [meId, otherId],
      messages: [],
      unread: 0,
      createdAt: nowIso(),
    },
  ];
  saveToStorage(next);
  return id;
}

export function createGroup(
  meId: string,
  memberIds: string[],
  name: string
): string {
  const threads = loadFromStorage();
  const id = uid("t");
  const next: ChatThread[] = [
    ...threads,
    {
      id,
      kind: "group",
      memberIds: Array.from(new Set([meId, ...memberIds])),
      name: name.trim() || "Untitled group",
      messages: [],
      unread: 0,
      createdAt: nowIso(),
    },
  ];
  saveToStorage(next);
  return id;
}

export function totalUnread(): number {
  return loadFromStorage().reduce((s, t) => s + t.unread, 0);
}

/** React hook — re-renders when any thread changes. */
export function useChat(meId: string, otherIds: string[]) {
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    typeof window !== "undefined" ? loadFromStorage() : []
  );

  useEffect(() => {
    ensureSeeded(meId, otherIds);
    const sync = () => setThreads(loadFromStorage());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, otherIds.join(",")]);

  return {
    threads,
    send: useCallback(
      (threadId: string, text: string) => sendMessage(threadId, meId, text),
      [meId]
    ),
    markRead: useCallback((threadId: string) => markThreadRead(threadId), []),
    startDM: useCallback(
      (otherId: string) => createDM(meId, otherId),
      [meId]
    ),
    startGroup: useCallback(
      (ids: string[], name: string) => createGroup(meId, ids, name),
      [meId]
    ),
    unreadCount: threads.reduce((s, t) => s + t.unread, 0),
  };
}
