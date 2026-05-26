"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, Github } from "lucide-react";
import { ChartCard } from "./chart-card";
import { commitsLast30Days, forecastSummary as mockSummary } from "@/mock/timeseries";
import { buildCommitsForecast, type CommitPoint } from "@/lib/ml/forecast";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";
import { cn } from "@/lib/utils";

type Range = "last7d" | "last30d" | "last90d" | "lastYear";

const RANGE_LABEL: Record<Range, { short: string; long: string; days: number }> = {
  last7d: { short: "7d", long: "Last 7 days", days: 7 },
  last30d: { short: "30d", long: "Last 30 days", days: 30 },
  last90d: { short: "90d", long: "Last 90 days", days: 90 },
  lastYear: { short: "1y", long: "Last year", days: 365 },
};

const MOCK_TODAY_LABEL = "May 25";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  const isForecast = p?.isForecast;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground flex items-center gap-1.5">
        {label}
        {isForecast && (
          <span className="inline-flex items-center gap-0.5 rounded border border-rose-400/30 bg-rose-400/10 px-1 py-px text-[9px] font-semibold text-rose-300">
            <Sparkles className="h-2 w-2" />
            forecast
          </span>
        )}
      </div>
      {isForecast ? (
        <div className="mt-1 space-y-0.5 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Predicted: <span className="text-foreground font-medium">{p.predicted}</span>
          </div>
          <div className="text-[10px]">
            95% CI: {p.ciLow}–{p.ciHigh}
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {p.commits} commits
        </div>
      )}
    </div>
  );
}

type DailyPoint = { iso: string; count: number };

export function CommitsChart({ delay = 0 }: { delay?: number }) {
  const { linked } = useGithub();
  const [allDays, setAllDays] = useState<DailyPoint[] | null>(null);
  const [range, setRange] = useState<Range>("last30d");

  // Fetch the full 365-day series from the contributions endpoint once.
  // We slice client-side to switch ranges without re-fetching.
  useEffect(() => {
    if (!linked) {
      setAllDays(null);
      return;
    }
    let cancelled = false;
    fetch("/api/github/contributions", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { cells: { iso: string; count: number }[] }) => {
        if (cancelled) return;
        if (Array.isArray(json.cells) && json.cells.length > 0) {
          // Filter out future dates the API sometimes returns
          const today = new Date();
          const filtered = json.cells
            .filter((c) => new Date(c.iso) <= today)
            .sort((a, b) => a.iso.localeCompare(b.iso));
          setAllDays(filtered);
        }
      })
      .catch(() => {
        if (!cancelled) setAllDays(null);
      });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  const { points, summary, todayLabel, source, totalInWindow } = useMemo(() => {
    const meta = RANGE_LABEL[range];

    // Live path
    if (allDays && allDays.length > 0) {
      const sliced = allDays.slice(-meta.days);
      const todayIso = new Date().toISOString().slice(0, 10);
      const f = buildCommitsForecast(
        sliced.map((d) => ({ iso: d.iso, commits: d.count })),
        todayIso
      );
      const total = sliced.reduce((s, d) => s + d.count, 0);
      return {
        points: f.points,
        summary: f.summary,
        todayLabel: f.todayLabel,
        source: "live" as const,
        totalInWindow: total,
      };
    }

    // Mock path: we have 30 days. For larger windows, just use what we have.
    const mockHistory = (commitsLast30Days as CommitPoint[]).filter(
      (p) => !p.isForecast && p.commits !== null
    );
    const sliced = mockHistory.slice(-Math.min(meta.days, mockHistory.length));
    const todayIso = new Date().toISOString().slice(0, 10);
    if (sliced.length > 0) {
      const f = buildCommitsForecast(
        sliced.map((p) => ({ iso: p.iso, commits: p.commits as number })),
        todayIso
      );
      const total = sliced.reduce((s, p) => s + (p.commits as number), 0);
      return {
        points: f.points,
        summary: f.summary,
        todayLabel: f.todayLabel,
        source: "mock" as const,
        totalInWindow: total,
      };
    }
    return {
      points: commitsLast30Days as CommitPoint[],
      summary: mockSummary,
      todayLabel: MOCK_TODAY_LABEL,
      source: "mock" as const,
      totalInWindow: 0,
    };
  }, [allDays, range]);

  // X-axis tick density — fewer ticks for wider windows so labels don't overlap.
  const xInterval =
    range === "last7d" ? 0 : range === "last30d" ? 3 : range === "last90d" ? 10 : 35;

  return (
    <ChartCard
      title="Commits over time"
      subtitle={
        source === "live"
          ? `${RANGE_LABEL[range].long} from GitHub + 7-day forecast`
          : `${RANGE_LABEL[range].long} + 7-day forecast`
      }
      delay={delay}
      toolbar={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {source === "live" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
              <Github className="h-2.5 w-2.5" />
              live
            </span>
          )}
          <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-400/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
            <Sparkles className="h-2.5 w-2.5" />
            forecast {Math.round(summary.modelAccuracy * 100)}% R²
          </span>
          <div className="inline-flex items-center gap-0.5 rounded-md border border-foreground/[0.08] bg-background/50 p-0.5 text-[11px]">
            {(["last7d", "last30d", "last90d", "lastYear"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded px-2 py-0.5 font-medium transition-colors",
                  range === r
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={range === r}
              >
                {RANGE_LABEL[r].short}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="commits-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ci-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={xInterval}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))" }} />

            <ReferenceLine
              x={todayLabel}
              stroke="#fb7185"
              strokeDasharray="2 3"
              strokeOpacity={0.6}
              label={{
                value: "today",
                position: "top",
                fill: "#fb7185",
                fontSize: 9,
              }}
            />

            <Area
              type="monotone"
              dataKey="ciHigh"
              stroke="none"
              fill="url(#ci-grad)"
              isAnimationActive={false}
              activeDot={false}
            />
            <Area
              type="monotone"
              dataKey="ciLow"
              stroke="none"
              fill="hsl(var(--card))"
              fillOpacity={1}
              isAnimationActive={false}
              activeDot={false}
            />

            <Area
              type="monotone"
              dataKey="commits"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#commits-grad)"
              connectNulls={false}
            />

            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#fb7185"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] flex-wrap">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-emerald-400" />
            <span>actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg,#fb7185 0 3px,transparent 3px 6px)",
              }}
            />
            <span>predicted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-rose-500/25" />
            <span>95% CI</span>
          </div>
        </div>
        <div className="text-muted-foreground tabular-nums">
          {totalInWindow > 0 && (
            <span>
              total:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {totalInWindow}
              </span>{" "}
              <span className="text-[10px]">in window</span>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
            </span>
          )}
          next 7d:{" "}
          <span className="font-semibold text-foreground">
            ~{summary.next7Total}
          </span>{" "}
          <span className="text-[10px]">
            ({summary.ciLowTotal}–{summary.ciHighTotal})
          </span>
        </div>
      </div>
    </ChartCard>
  );
}
