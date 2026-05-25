"use client";

import { motion } from "framer-motion";
import {
  GitCommit,
  GitPullRequest,
  AlertCircle,
  Flame,
  Folder,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/format";
import type { Metric } from "@/mock/metrics";

const ICONS: Record<Metric["icon"], LucideIcon> = {
  gitcommit: GitCommit,
  gitpr: GitPullRequest,
  alertcircle: AlertCircle,
  flame: Flame,
  folder: Folder,
};

export function MetricCard({ metric, index = 0 }: { metric: Metric; index?: number }) {
  const Icon = ICONS[metric.icon];
  const goodDirection = metric.good === "up";
  const isGood =
    (goodDirection && metric.trend === "up") ||
    (!goodDirection && metric.trend === "down") ||
    metric.trend === "flat";
  const trendChip = isGood
    ? metric.trend === "flat"
      ? "border-border bg-muted text-muted-foreground"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
    : "border-rose-500/20 bg-rose-500/10 text-rose-500";

  const TrendIcon =
    metric.trend === "up"
      ? TrendingUp
      : metric.trend === "down"
        ? TrendingDown
        : Minus;

  const anomaly = metric.anomaly;
  const anomalySign = anomaly && anomaly.sigma > 0 ? "+" : "";
  const anomalyHigh = anomaly && Math.abs(anomaly.sigma) >= 2;
  const anomalyClass = anomaly
    ? anomalyHigh
      ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-70 blur-2xl bg-gradient-to-br",
          metric.accent
        )}
      />

      <div className="relative flex items-start justify-between mb-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br",
            metric.accent
          )}
        >
          <Icon className={cn("h-4 w-4", metric.iconColor)} strokeWidth={2.2} />
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
            trendChip
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {formatDelta(metric.delta)}
        </div>
      </div>

      <div className="relative">
        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
        <div className="mt-1 flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {metric.value}
          </span>
          {metric.sub && (
            <span className="text-[11px] text-muted-foreground">{metric.sub}</span>
          )}
        </div>
        {anomaly && (
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold cursor-help tabular-nums",
                    anomalyClass
                  )}
                >
                  <Activity className="h-2.5 w-2.5" />
                  {anomalySign}
                  {anomaly.sigma.toFixed(1)}σ{" "}
                  <span className="opacity-70">{anomaly.kind}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <div className="font-medium">
                  {Math.abs(anomaly.sigma).toFixed(1)}σ {anomaly.kind} detected
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  vs. {anomaly.baseline}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="relative mt-3 h-10 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.sparkColor} stopOpacity={0.45} />
                <stop offset="100%" stopColor={metric.sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={metric.sparkColor}
              strokeWidth={1.75}
              fill={`url(#spark-${metric.key})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
