"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Flame,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  Insight,
  InsightCategory,
  ModelMetadata,
} from "@/mock/insights-fallback";

const CATEGORY_META: Record<
  InsightCategory,
  { icon: LucideIcon; label: string; ring: string; iconBg: string; iconColor: string }
> = {
  productivity: {
    icon: Flame,
    label: "Productivity",
    ring: "ring-emerald-400/20 hover:ring-emerald-400/40",
    iconBg: "bg-emerald-400/15",
    iconColor: "text-emerald-300",
  },
  trend: {
    icon: TrendingUp,
    label: "Trend",
    ring: "ring-cyan-400/20 hover:ring-cyan-400/40",
    iconBg: "bg-cyan-400/15",
    iconColor: "text-cyan-300",
  },
  warning: {
    icon: AlertTriangle,
    label: "Watch",
    ring: "ring-amber-400/20 hover:ring-amber-400/40",
    iconBg: "bg-amber-400/15",
    iconColor: "text-amber-300",
  },
  suggestion: {
    icon: Lightbulb,
    label: "Suggestion",
    ring: "ring-rose-400/20 hover:ring-rose-400/40",
    iconBg: "bg-rose-400/15",
    iconColor: "text-rose-300",
  },
};

type Resp = {
  insights: Insight[];
  source: "ai" | "mock";
  metadata: ModelMetadata;
};

function confidenceColor(c: number): string {
  if (c >= 0.9) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (c >= 0.75) return "border-cyan-400/30 bg-cyan-400/10 text-cyan-300";
  return "border-amber-400/30 bg-amber-400/10 text-amber-300";
}

export function InsightsPanel({ delay = 0 }: { delay?: number }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      const json: Resp = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInsights();
  };

  return (
    <motion.section
      id="insights"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="glass-strong border-gradient relative overflow-hidden rounded-2xl p-6 scroll-mt-20"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-rose-500/12 blur-3xl" />

      <header className="relative flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 shadow shadow-emerald-500/30">
              <Sparkles className="h-3 w-3 text-emerald-950" strokeWidth={2.5} />
            </span>
            AI insights
            {data && (
              <span
                className={cn(
                  "ml-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                  data.source === "ai"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-secondary/50 text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    data.source === "ai" ? "bg-emerald-500" : "bg-muted-foreground"
                  )}
                />
                {data.source === "ai" ? "Claude" : "Demo"}
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Auto-generated from your activity
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          aria-label="Refresh insights"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </header>

      {/* Model metadata strip */}
      {data && (
        <div className="relative mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 bg-background/40 px-3 py-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-violet-400" />
            <span className="font-medium text-foreground/80">
              {data.metadata.model}
            </span>
          </div>
          <span className="text-muted-foreground/50">·</span>
          <span>
            <span className="tabular-nums text-foreground/80">
              {data.metadata.commitsAnalyzed.toLocaleString()}
            </span>{" "}
            commits
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            <span className="tabular-nums text-foreground/80">
              {data.metadata.reposAnalyzed}
            </span>{" "}
            repos
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            <span className="tabular-nums text-foreground/80">
              {data.metadata.signalLayers}
            </span>{" "}
            signal layers
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            <span className="tabular-nums text-foreground/80">
              {data.metadata.computeMs}ms
            </span>{" "}
            compute
          </span>
        </div>
      )}

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/60 bg-background/30 p-4"
            >
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-5/6" />
            </div>
          ))
        ) : (
          <TooltipProvider delayDuration={150}>
            <AnimatePresence mode="popLayout">
              {data?.insights.map((insight, i) => {
                const meta = CATEGORY_META[insight.category];
                const Icon = meta.icon;
                return (
                  <motion.article
                    key={`${insight.title}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    whileHover={{ y: -2 }}
                    className={cn(
                      "group relative rounded-xl bg-background/30 p-4 ring-1 transition-all backdrop-blur-sm",
                      meta.ring
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          meta.iconBg
                        )}
                      >
                        <Icon
                          className={cn("h-4 w-4", meta.iconColor)}
                          strokeWidth={2.2}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {meta.label}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums cursor-help",
                                  confidenceColor(insight.confidence)
                                )}
                              >
                                {Math.round(insight.confidence * 100)}%
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px]">
                              <div className="font-medium mb-1">
                                Confidence: {(insight.confidence * 100).toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Based on {insight.signals.length} signal
                                {insight.signals.length === 1 ? "" : "s"}:
                              </div>
                              <ul className="mt-0.5 text-[10px] text-foreground/80 leading-tight">
                                {insight.signals.map((s) => (
                                  <li key={s}>· {s}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <h4 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">
                          {insight.title}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {insight.body}
                        </p>
                        {insight.signals.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {insight.signals.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                              >
                                {s}
                              </span>
                            ))}
                            {insight.signals.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{insight.signals.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </TooltipProvider>
        )}
      </div>
    </motion.section>
  );
}
