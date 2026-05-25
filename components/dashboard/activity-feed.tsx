"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  GitCommit,
  GitPullRequest,
  GitMerge,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Github,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  activity as mockActivity,
  classifyEvent,
  type ActivityEvent,
  type ActivityKind,
  type WorkKind,
} from "@/mock/activity";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  ActivityKind,
  { icon: LucideIcon; label: string; color: string; bg: string }
> = {
  commit: {
    icon: GitCommit,
    label: "committed",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  pr_opened: {
    icon: GitPullRequest,
    label: "opened PR",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  pr_merged: {
    icon: GitMerge,
    label: "merged PR",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  issue_opened: {
    icon: AlertCircle,
    label: "opened issue",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  issue_closed: {
    icon: CheckCircle2,
    label: "closed issue",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  review: {
    icon: MessageSquare,
    label: "reviewed",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
};

const WORK_KIND_META: Record<
  WorkKind,
  { label: string; classes: string }
> = {
  feature: {
    label: "feature",
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  bugfix: {
    label: "bugfix",
    classes: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  },
  refactor: {
    label: "refactor",
    classes: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
  chore: {
    label: "chore",
    classes: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  },
  docs: {
    label: "docs",
    classes: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  },
  perf: {
    label: "perf",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  review: {
    label: "review",
    classes: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400",
  },
};

export function ActivityFeed({ delay = 0 }: { delay?: number }) {
  const { linked } = useGithub();
  const [events, setEvents] = useState<ActivityEvent[]>(mockActivity);
  const [source, setSource] = useState<"mock" | "live">("mock");

  useEffect(() => {
    if (!linked) {
      setEvents(mockActivity);
      setSource("mock");
      return;
    }
    let cancelled = false;
    fetch("/api/github/events", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { events: ActivityEvent[] }) => {
        if (cancelled) return;
        if (Array.isArray(json.events) && json.events.length > 0) {
          setEvents(json.events);
          setSource("live");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEvents(mockActivity);
          setSource("mock");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  const classified = events.map(classifyEvent);

  // Aggregate work-kind mix for the header
  const total = classified.length;
  const mix = classified.reduce<Record<WorkKind, number>>(
    (acc, e) => {
      acc[e.workKind] = (acc[e.workKind] ?? 0) + 1;
      return acc;
    },
    { feature: 0, bugfix: 0, refactor: 0, chore: 0, docs: 0, perf: 0, review: 0 }
  );
  const avgConfidence =
    classified.reduce((s, e) => s + e.classifierConfidence, 0) / total;

  return (
    <motion.section
      id="activity"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-full scroll-mt-20"
    >
      <header className="flex items-start justify-between p-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            Activity feed
            {source === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                <Github className="h-2.5 w-2.5" />
                live
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-violet-400" />
            Auto-classified by Pulse · {total} events ·{" "}
            <span className="tabular-nums font-medium text-foreground/80">
              {Math.round(avgConfidence * 100)}%
            </span>{" "}
            avg conf.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </header>

      {/* Work-mix bar */}
      <div className="px-5 pb-3">
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          {(["feature", "bugfix", "refactor", "perf", "chore", "docs", "review"] as WorkKind[]).map(
            (k) => {
              const count = mix[k];
              if (count === 0) return null;
              const pct = (count / total) * 100;
              return (
                <TooltipProvider key={k} delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-full transition-opacity hover:opacity-80",
                          WORK_KIND_META[k].classes.split(" ")[1] // bg-*
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <span className="capitalize font-medium">{k}</span>:{" "}
                      <span className="tabular-nums">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
          )}
        </div>
      </div>

      <ScrollArea className="h-[520px] px-5 pb-5">
        <ol className="relative space-y-3">
          <span className="absolute left-[14px] top-1 bottom-1 w-px bg-border" />
          {classified.map((event, idx) => {
            const meta = KIND_META[event.kind];
            const work = WORK_KIND_META[event.workKind];
            const Icon = meta.icon;
            return (
              <motion.li
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.02 * idx, ease: "easeOut" }}
                className="relative flex items-start gap-3 pl-0"
              >
                <div className={cn("relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border", meta.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className={`bg-gradient-to-br ${event.actor.color} text-white text-[8px] font-semibold`}>
                        {event.actor.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{event.actor.name}</span>
                    <span className="text-muted-foreground">{meta.label}</span>
                    <span className="inline-flex items-center rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-mono">
                      {event.repo}
                    </span>
                    <TooltipProvider delayDuration={120}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold cursor-help",
                              work.classes
                            )}
                          >
                            {work.label}
                            <span className="opacity-60 tabular-nums">
                              {Math.round(event.classifierConfidence * 100)}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Classified as <span className="font-medium">{work.label}</span>{" "}
                          <span className="text-muted-foreground">
                            ({(event.classifierConfidence * 100).toFixed(0)}% confidence)
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {event.relative}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-foreground/90 truncate">
                    {event.title}
                  </p>
                  {event.meta && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">
                      {event.meta}
                    </p>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
      </ScrollArea>
    </motion.section>
  );
}
