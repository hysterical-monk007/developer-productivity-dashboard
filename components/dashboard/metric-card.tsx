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
      ? "border-foreground/10 bg-foreground/5 text-muted-foreground"
      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : "border-rose-400/30 bg-rose-400/10 text-rose-300";

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
      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
      : "border-amber-400/30 bg-amber-400/10 text-amber-300"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group glass relative overflow-hidden rounded-2xl p-5 transition-shadow hover:shadow-2xl"
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-80 blur-3xl bg-gradient-to-br",
          metric.accent
        )}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-foreground/10",
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
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {metric.label}
        </p>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-3xl font-semibold tracking-tight tabular-nums">
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
                    "mt-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold cursor-help tabular-nums",
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

      <div className="relative mt-4 h-12 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.sparkline} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metric.sparkColor} stopOpacity={0.5} />
                <stop offset="100%" stopColor={metric.sparkColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={metric.sparkColor}
              strokeWidth={2}
              fill={`url(#spark-${metric.key})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
