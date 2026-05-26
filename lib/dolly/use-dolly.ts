"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";
import { useGithubStats } from "@/lib/use-github-stats";
import { useTeam, useCurrentMember } from "@/lib/team-store";
import { buildDollyContext, type DollyContext } from "./context";
import { activity as mockActivity, classifyEvent } from "@/mock/activity";
import { repos as mockRepos } from "@/mock/repos";
import { commitsLast30Days } from "@/mock/timeseries";
import { dollyBackendHeaders } from "./backend-prefs";

export type DollyMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: "ai" | "ollama" | "local";
  sourceMeta?: { model?: string; fallbackFrom?: string };
  at: string;
};

const HISTORY_KEY = "devdash_dolly_history";

function loadHistory(): DollyMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DollyMessage[];
  } catch {
    return [];
  }
}

function saveHistory(messages: DollyMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-50)));
}

function uid(): string {
  return `m-${Math.random().toString(36).slice(2, 10)}`;
}

export function useDolly() {
  const { linked, profile } = useGithub();
  const { stats } = useGithubStats();
  const { team } = useTeam();
  const me = useCurrentMember();

  const [messages, setMessages] = useState<DollyMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  /** Build a fresh DollyContext from the latest data. */
  const buildContext = useCallback(async (): Promise<DollyContext> => {
    // Roles breakdown
    const rolesBreakdown: Record<string, number> = {};
    for (const m of team) {
      rolesBreakdown[m.role] = (rolesBreakdown[m.role] ?? 0) + 1;
    }

    const baseInput = {
      displayName: linked && profile?.name ? profile.name : me?.name ?? "Developer",
      handle: linked && profile?.login ? profile.login : me?.username ?? "you",
      bio: profile?.bio ?? null,
      linkedToGithub: linked,
      role: me?.role ?? "owner",
      team: {
        totalMembers: team.length,
        rolesBreakdown,
      },
    };

    // Live path: try to fetch repos + events when linked
    if (linked) {
      const [reposRes, eventsRes] = await Promise.all([
        fetch("/api/github/repos", {
          headers: getGithubFetchHeaders(),
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("/api/github/events", {
          headers: getGithubFetchHeaders(),
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      // Pull up to 20 repos so Dolly knows about every project — not just
      // the 6 the dashboard widget shows. The long tail gives her enough
      // context to mention specific projects by name when answering.
      const liveRepos =
        reposRes?.repos?.slice(0, 20).map((r: { name: string; language: string; commitsThisWeek: number }) => ({
          name: r.name,
          language: r.language,
          commitsThisWeek: r.commitsThisWeek,
        })) ?? [];

      const liveActivity =
        eventsRes?.events?.slice(0, 12).map((e: { title: string; repo: string; kind: string; relative: string }) => ({
          title: e.title,
          repo: e.repo,
          kind: e.kind,
          when: e.relative,
        })) ?? [];

      const liveCommitsDaily =
        eventsRes?.commitsDaily?.map((d: { iso: string; count: number }) => d) ??
        commitsLast30Days
          .filter((p) => !p.isForecast && p.commits !== null)
          .map((p) => ({ iso: p.iso, count: p.commits as number }));

      return buildDollyContext({
        ...baseInput,
        stats: {
          commits24h: stats?.contributionsByWindow?.today,
          commits7d: stats?.contributionsByWindow?.last7d,
          commits30d: stats?.contributionsByWindow?.last30d,
          commitsYear: stats?.contributionsByWindow?.lastYear,
          prsOpen: stats?.prsOpen ?? 0,
          prsMerged: stats?.prsMerged ?? 0,
          issuesOpen: stats?.issuesOpen ?? 0,
          currentStreak: stats?.streak ?? 0,
          longestStreak: stats?.longestStreak ?? 0,
          activeRepos: stats?.activeRepos ?? liveRepos.length,
          mostActiveDay: stats?.mostActiveDay,
        },
        recentActivity: liveActivity,
        topRepos: liveRepos.length > 0 ? liveRepos : mockRepos.slice(0, 20).map((r) => ({
          name: r.name,
          language: r.language,
          commitsThisWeek: r.commitsThisWeek,
        })),
        commitsDaily: liveCommitsDaily,
      });
    }

    // Demo path
    return buildDollyContext({
      ...baseInput,
      stats: {
        commits24h: 11,
        commits7d: 73,
        commits30d: 287,
        commitsYear: 1284,
        prsOpen: 47,
        prsMerged: 312,
        issuesOpen: 23,
        currentStreak: 18,
        longestStreak: 42,
        activeRepos: 12,
        mostActiveDay: "Wednesday",
      },
      recentActivity: mockActivity.slice(0, 12).map((a) => ({
        title: a.title,
        repo: a.repo,
        kind: a.kind,
        when: a.relative,
      })),
      topRepos: mockRepos.slice(0, 6).map((r) => ({
        name: r.name,
        language: r.language,
        commitsThisWeek: r.commitsThisWeek,
      })),
      commitsDaily: commitsLast30Days
        .filter((p) => !p.isForecast && p.commits !== null)
        .map((p) => ({ iso: p.iso, count: p.commits as number })),
    });
  }, [linked, profile, me, team, stats]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || streaming) return;

      // Add user message
      const userMsg: DollyMessage = {
        id: uid(),
        role: "user",
        text: q,
        at: new Date().toISOString(),
      };
      const assistantId = uid();
      setMessages((m) => {
        const next = [
          ...m,
          userMsg,
          {
            id: assistantId,
            role: "assistant" as const,
            text: "",
            at: new Date().toISOString(),
          },
        ];
        saveHistory(next);
        return next;
      });
      setStreaming(true);

      try {
        const ctx = await buildContext();
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/dolly", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...dollyBackendHeaders(),
          },
          body: JSON.stringify({
            question: q,
            context: ctx,
            history: messages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text,
            })),
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let source: "ai" | "ollama" | "local" = "local";
        let sourceMeta: { model?: string; fallbackFrom?: string } | undefined;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload);
              if (evt.delta) {
                setMessages((m) => {
                  const next = m.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, text: msg.text + evt.delta }
                      : msg
                  );
                  return next;
                });
              }
              if (evt.done) {
                source = evt.source ?? source;
                if (evt.model || evt.fallbackFrom) {
                  sourceMeta = {
                    model: evt.model,
                    fallbackFrom: evt.fallbackFrom,
                  };
                }
              }
            } catch {
              // ignore malformed lines
            }
          }
        }

        setMessages((m) => {
          const next = m.map((msg) =>
            msg.id === assistantId ? { ...msg, source, sourceMeta } : msg
          );
          saveHistory(next);
          return next;
        });
      } catch (err) {
        setMessages((m) => {
          const next = m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  text:
                    "Hmm — something hiccuped while I was thinking. Try again?",
                  source: "local" as const,
                }
              : msg
          );
          saveHistory(next);
          return next;
        });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [buildContext, messages, streaming]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    saveHistory([]);
  }, []);

  // Some pre-built suggestion prompts contextualized to the user
  const suggestions = useMemo(() => {
    const list: string[] = [
      "What have I been doing this week?",
      "Summarize my last 30 days",
      "How's my streak looking?",
      "Anything I should worry about?",
      "Which repo am I most active in?",
    ];
    if (linked && profile) {
      list.unshift(`Give me a quick summary, ${profile.name?.split(" ")[0] ?? "boss"}-style`);
    }
    return list;
  }, [linked, profile]);

  return { messages, streaming, ask, stop, clear, suggestions };
}
