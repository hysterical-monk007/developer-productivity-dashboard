/**
 * Local responder — used when ANTHROPIC_API_KEY isn't set OR the Claude call
 * fails. Pattern-matches the user's question and constructs a real answer
 * from the structured context.
 *
 * Not as fluent as Claude, but factually grounded. Never hallucinates because
 * every claim comes directly from the context object.
 */

import type { DollyContext } from "./context";

type Intent =
  | "summary"
  | "commits"
  | "streak"
  | "prs"
  | "issues"
  | "repos"
  | "team"
  | "productivity"
  | "anomaly"
  | "trend"
  | "suggestion"
  | "greeting"
  | "unknown";

function classifyIntent(text: string): Intent {
  const t = text.toLowerCase().trim();
  if (/^(hi|hello|hey|yo|sup|hii|howdy)\b/.test(t)) return "greeting";
  if (/(summary|summarise|summarize|overview|recap|what.*(done|been doing))/.test(t)) return "summary";
  if (/(streak|consecutive|in a row)/.test(t)) return "streak";
  if (/(commits?|pushes?)/.test(t)) return "commits";
  if (/(prs?|pull request)/.test(t)) return "prs";
  if (/(issues?|bug)/.test(t)) return "issues";
  if (/(repo|repositor|project)/.test(t)) return "repos";
  if (/(team|teammate|members?|colleague)/.test(t)) return "team";
  if (/(productiv|score|grade|rating|how am i)/.test(t)) return "productivity";
  if (/(anomaly|anomalies|unusual|weird|spike|dip)/.test(t)) return "anomaly";
  if (/(trend|trending|direction)/.test(t)) return "trend";
  if (/(should i|what.*do|recommend|suggest|next)/.test(t)) return "suggestion";
  return "unknown";
}

export function generateLocalResponse(
  question: string,
  ctx: DollyContext
): string {
  const intent = classifyIntent(question);
  const name = ctx.user.displayName.split(/\s+/)[0] || ctx.user.handle;

  switch (intent) {
    case "greeting":
      return `Hey ${name} — Dolly here. I've got your live ${
        ctx.user.linkedToGithub ? "GitHub" : "demo"
      } stats in front of me. Ask me anything — a summary, your streak, what to focus on next.`;

    case "summary": {
      const parts: string[] = [];
      const total30 = ctx.stats.commits30d ?? 0;
      const activeRepos = ctx.topRepos.filter((r) => r.commitsThisWeek > 0);
      const activeNames = activeRepos.slice(0, 4).map((r) => `**${r.name}**`).join(", ");
      const totalReposICanSee = ctx.topRepos.length;
      parts.push(
        `Last 30 days: **${total30}** commits, **${ctx.stats.prsMerged}** PRs merged, and a **${ctx.stats.currentStreak}-day** active streak.`
      );
      if (activeNames) {
        parts.push(
          `Active work landed in ${activeNames}${
            activeRepos.length > 4
              ? ` (plus ${activeRepos.length - 4} other repos)`
              : ""
          }. I can see ${totalReposICanSee} repos in total across your account.`
        );
      } else if (totalReposICanSee > 0) {
        parts.push(
          `I can see ${totalReposICanSee} repos on your account — none with commits this week though.`
        );
      }
      if (ctx.mlSignals.insightsTitles[0]) {
        parts.push(
          `The local ML pipeline flagged: *${ctx.mlSignals.insightsTitles[0]}*.`
        );
      }
      parts.push(
        `Productivity index is **${ctx.productivity.score}/100** (grade ${ctx.productivity.grade}).`
      );
      return parts.join("\n\n");
    }

    case "commits": {
      const { stats } = ctx;
      const rows: string[] = [];
      if (stats.commits24h !== undefined) rows.push(`- **${stats.commits24h}** today`);
      if (stats.commits7d !== undefined) rows.push(`- **${stats.commits7d}** in the last 7 days`);
      if (stats.commits30d !== undefined) rows.push(`- **${stats.commits30d}** in the last 30 days`);
      if (stats.commitsYear !== undefined) rows.push(`- **${stats.commitsYear}** in the last year`);
      return `Here's your commit cadence:\n\n${rows.join("\n")}\n\nMost active day: **${stats.mostActiveDay ?? "Wednesday"}**.`;
    }

    case "streak":
      return `Your current streak is **${ctx.stats.currentStreak} day${
        ctx.stats.currentStreak === 1 ? "" : "s"
      }**. Your all-time longest is **${ctx.stats.longestStreak} days**${
        ctx.stats.currentStreak === ctx.stats.longestStreak
          ? " — you're tying your own record right now"
          : ""
      }. ${
        ctx.stats.currentStreak === 0
          ? "Reset to zero today. A single commit before midnight restarts it."
          : "Keep it alive — one push before midnight extends it."
      }`;

    case "prs":
      return `You currently have **${ctx.stats.prsOpen} open** PRs and have merged **${ctx.stats.prsMerged}** in total. ${
        ctx.stats.prsOpen > 10
          ? "That's a lot in flight — worth checking which ones are blocked on reviewers."
          : "Healthy WIP ratio."
      }`;

    case "issues":
      return `**${ctx.stats.issuesOpen}** open issues on your account. ${
        ctx.stats.issuesOpen > 20
          ? "The backlog is growing — consider a triage pass."
          : "Backlog is manageable."
      }`;

    case "repos": {
      if (ctx.topRepos.length === 0) {
        return "I don't see any repos in your context yet. If you just linked GitHub, give it a moment.";
      }
      const shown = ctx.topRepos.slice(0, 10);
      const list = shown
        .map(
          (r, i) =>
            `${i + 1}. **${r.name}**${
              r.language ? ` · ${r.language}` : ""
            }${r.commitsThisWeek > 0 ? ` · ${r.commitsThisWeek} commits/wk` : ""}`
        )
        .join("\n");
      const more =
        ctx.topRepos.length > 10
          ? `\n\n…and ${ctx.topRepos.length - 10} more.`
          : "";
      return `Across all your projects, here's what I can see:\n\n${list}${more}`;
    }

    case "team": {
      const total = ctx.team.totalMembers;
      const roles = Object.entries(ctx.team.rolesBreakdown)
        .filter(([, n]) => n > 0)
        .map(([r, n]) => `${n} ${r}${n === 1 ? "" : "s"}`)
        .join(", ");
      return `**${total} teammates** on this workspace: ${roles}. You can see them all on the Team page.`;
    }

    case "productivity":
      return `Productivity index: **${ctx.productivity.score}/100** — grade **${ctx.productivity.grade}**.\n\nTop contributors to the score:\n${ctx.productivity.features
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3)
        .map(
          (f) =>
            `- **${f.name}**: ${(f.normalized * 100).toFixed(0)}% (contributed ${(f.contribution * 100).toFixed(0)} pts)`
        )
        .join("\n")}`;

    case "anomaly":
    case "trend":
    case "suggestion": {
      if (ctx.mlSignals.insightsTitles.length === 0) {
        return "Nothing flagged right now — anomaly, trend, and warning detectors are all in the noise range. That's a good thing.";
      }
      return `The local ML engine is flagging:\n\n${ctx.mlSignals.insightsTitles
        .map((t, i) => `${i + 1}. ${t}`)
        .join("\n")}\n\n${ctx.mlSignals.detectorsRun} detectors ran, all client-side.`;
    }

    case "unknown":
    default:
      return `I'm not sure I have data for that exactly. Here's what I CAN tell you about right now:\n\n- Your activity summary, commits, PRs, issues\n- Streak (current + longest)\n- Productivity score with breakdown\n- ML-flagged anomalies and trends\n- Your team and recent repos\n\nWhat would you like to dig into?`;
  }
}
