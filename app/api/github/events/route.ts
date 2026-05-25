import { NextResponse } from "next/server";
import { getGithubToken, ghFetch, type GhEvent, type GhUser } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventOut = {
  id: string;
  kind:
    | "commit"
    | "pr_opened"
    | "pr_merged"
    | "issue_opened"
    | "issue_closed"
    | "review";
  actor: { name: string; avatar: string; color: string; avatarUrl: string };
  repo: string;
  title: string;
  meta?: string;
  timestamp: string;
  relative: string;
};

function avatarFallback(login: string): string {
  return login.slice(0, 2).toUpperCase();
}

function relative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / (30 * 86400))}mo ago`;
}

function shapeEvent(ev: GhEvent): EventOut | null {
  const baseActor = {
    name: ev.actor.login,
    avatar: avatarFallback(ev.actor.login),
    color: "from-violet-500 to-fuchsia-500",
    avatarUrl: ev.actor.avatar_url,
  };
  const repo = ev.repo.name.split("/").pop() ?? ev.repo.name;
  const ts = ev.created_at;

  switch (ev.type) {
    case "PushEvent": {
      const commits =
        (ev.payload as { commits?: { message: string; sha: string }[] })
          .commits ?? [];
      const first = commits[0];
      if (!first) {
        // Empty push (e.g. branch creation push) — still surface it
        return {
          id: ev.id,
          kind: "commit",
          actor: baseActor,
          repo,
          title: "pushed to a branch",
          timestamp: ts,
          relative: relative(ts),
        };
      }
      return {
        id: ev.id,
        kind: "commit",
        actor: baseActor,
        repo,
        title: first.message.split("\n")[0],
        meta:
          commits.length > 1
            ? `${commits.length} commits · ${first.sha.slice(0, 7)}`
            : first.sha.slice(0, 7),
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "PullRequestEvent": {
      const p = ev.payload as {
        action: string;
        pull_request: { title: string; number: number; merged?: boolean };
      };
      if (p.action === "opened" || p.action === "reopened") {
        return {
          id: ev.id,
          kind: "pr_opened",
          actor: baseActor,
          repo,
          title: p.pull_request.title,
          meta: `#${p.pull_request.number}`,
          timestamp: ts,
          relative: relative(ts),
        };
      }
      if (p.action === "closed") {
        return {
          id: ev.id,
          kind: p.pull_request.merged ? "pr_merged" : "pr_opened",
          actor: baseActor,
          repo,
          title: p.pull_request.title,
          meta: `#${p.pull_request.number}${p.pull_request.merged ? " merged" : " closed"}`,
          timestamp: ts,
          relative: relative(ts),
        };
      }
      return null;
    }
    case "IssuesEvent": {
      const p = ev.payload as {
        action: string;
        issue: { title: string; number: number };
      };
      if (p.action === "opened" || p.action === "reopened") {
        return {
          id: ev.id,
          kind: "issue_opened",
          actor: baseActor,
          repo,
          title: p.issue.title,
          meta: `#${p.issue.number}`,
          timestamp: ts,
          relative: relative(ts),
        };
      }
      if (p.action === "closed") {
        return {
          id: ev.id,
          kind: "issue_closed",
          actor: baseActor,
          repo,
          title: p.issue.title,
          meta: `#${p.issue.number}`,
          timestamp: ts,
          relative: relative(ts),
        };
      }
      return null;
    }
    case "PullRequestReviewEvent":
    case "PullRequestReviewCommentEvent": {
      const p = ev.payload as {
        pull_request: { title: string };
        review?: { state?: string };
      };
      return {
        id: ev.id,
        kind: "review",
        actor: baseActor,
        repo,
        title: `Reviewed: ${p.pull_request.title}`,
        meta: p.review?.state ?? "commented",
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "IssueCommentEvent": {
      const p = ev.payload as {
        issue: { title: string; number: number; pull_request?: unknown };
      };
      return {
        id: ev.id,
        kind: p.issue.pull_request ? "review" : "issue_opened",
        actor: baseActor,
        repo,
        title: `Commented: ${p.issue.title}`,
        meta: `#${p.issue.number}`,
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "CreateEvent": {
      const p = ev.payload as { ref_type: string; ref?: string };
      return {
        id: ev.id,
        kind: "commit",
        actor: baseActor,
        repo,
        title: `Created ${p.ref_type}${p.ref ? ` ${p.ref}` : ""}`,
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "ForkEvent": {
      return {
        id: ev.id,
        kind: "commit",
        actor: baseActor,
        repo,
        title: `Forked ${ev.repo.name}`,
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "WatchEvent": {
      return {
        id: ev.id,
        kind: "commit",
        actor: baseActor,
        repo,
        title: `Starred ${ev.repo.name}`,
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "ReleaseEvent": {
      const p = ev.payload as {
        action: string;
        release: { name?: string; tag_name: string };
      };
      return {
        id: ev.id,
        kind: "pr_merged",
        actor: baseActor,
        repo,
        title: `Released ${p.release.name ?? p.release.tag_name}`,
        meta: p.release.tag_name,
        timestamp: ts,
        relative: relative(ts),
      };
    }
    case "MemberEvent": {
      const p = ev.payload as {
        action: string;
        member: { login: string };
      };
      return {
        id: ev.id,
        kind: "review",
        actor: baseActor,
        repo,
        title: `${p.action} ${p.member.login}`,
        timestamp: ts,
        relative: relative(ts),
      };
    }
    default:
      return null;
  }
}

export async function GET(req: Request) {
  const token = await getGithubToken(req);
  if (!token) {
    return NextResponse.json({ error: "not_linked" }, { status: 401 });
  }
  try {
    const me = await ghFetch<GhUser>(token, "/user");
    const events = await ghFetch<GhEvent[]>(
      token,
      `/users/${me.login}/events?per_page=60`
    );
    const shaped = events.map(shapeEvent).filter((e): e is EventOut => Boolean(e)).slice(0, 40);

    // Aggregate daily commits for the last 30 days (from PushEvents) for the chart
    const dayMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const ev of events) {
      if (ev.type !== "PushEvent") continue;
      const day = ev.created_at.slice(0, 10);
      if (!dayMap.has(day)) continue;
      const commitCount =
        ((ev.payload as { commits?: unknown[] }).commits ?? []).length;
      dayMap.set(day, (dayMap.get(day) ?? 0) + commitCount);
    }
    const commitsDaily = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([iso, count]) => ({ iso, count }));

    console.log(
      `[github/events] returning ${shaped.length} events (from ${events.length} raw)`
    );
    return NextResponse.json(
      { events: shaped, commitsDaily, user: { login: me.login } },
      { headers: { "Cache-Control": "no-store" } }
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
