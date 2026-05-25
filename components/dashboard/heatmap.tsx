"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Github } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  heatmapCells as mockCells,
  totalContributions as mockTotal,
  type HeatmapCell,
} from "@/mock/heatmap";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";
import { cn } from "@/lib/utils";

const LEVEL_BG = {
  0: "bg-heat-0",
  1: "bg-heat-1",
  2: "bg-heat-2",
  3: "bg-heat-3",
  4: "bg-heat-4",
} as const;

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function chunkByWeek(cells: HeatmapCell[]) {
  const weeks: HeatmapCell[][] = [];
  let current: HeatmapCell[] = [];
  for (const cell of cells) {
    if (cell.dow === 0 && current.length > 0) {
      weeks.push(current);
      current = [];
    }
    current.push(cell);
  }
  if (current.length) weeks.push(current);
  return weeks;
}

export function Heatmap({ delay = 0 }: { delay?: number }) {
  const { linked } = useGithub();
  const [cells, setCells] = useState<HeatmapCell[]>(mockCells);
  const [total, setTotal] = useState(mockTotal);
  const [source, setSource] = useState<"mock" | "live">("mock");

  useEffect(() => {
    if (!linked) {
      setCells(mockCells);
      setTotal(mockTotal);
      setSource("mock");
      return;
    }
    let cancelled = false;
    fetch("/api/github/contributions", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { cells: HeatmapCell[]; totalContributions: number }) => {
        if (cancelled) return;
        if (Array.isArray(json.cells) && json.cells.length > 0) {
          setCells(json.cells);
          setTotal(json.totalContributions);
          setSource("live");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCells(mockCells);
          setTotal(mockTotal);
          setSource("mock");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  const weeks = chunkByWeek(cells);
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const firstCell = week[0];
    const d = new Date(firstCell.iso);
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ col: i, label: format(d, "MMM") });
      lastMonth = m;
    }
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card p-5 shadow-sm scroll-mt-20"
    >
      <header className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            Contribution activity
            {source === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                <Github className="h-2.5 w-2.5" />
                live
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {total.toLocaleString()}
            </span>{" "}
            contributions in the last year
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <span
              key={lv}
              className={cn(
                "h-2.5 w-2.5 rounded-sm",
                LEVEL_BG[lv as 0 | 1 | 2 | 3 | 4]
              )}
            />
          ))}
          <span>More</span>
        </div>
      </header>

      <div className="overflow-x-auto scrollbar-thin pb-1">
        <TooltipProvider delayDuration={100}>
          <div className="inline-flex flex-col gap-1 min-w-full">
            <div className="relative h-3 ml-7">
              <div className="flex gap-[3px]">
                {weeks.map((_, i) => {
                  const label = monthLabels.find((m) => m.col === i)?.label;
                  return (
                    <div key={i} className="w-2.5 relative">
                      {label && (
                        <span className="absolute -top-0.5 left-0 text-[10px] text-muted-foreground whitespace-nowrap">
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-1">
              <div className="flex flex-col gap-[3px] text-[10px] text-muted-foreground pr-1 pt-[1px]">
                {DAY_LABELS.map((d, i) => (
                  <div key={i} className="h-2.5 leading-none flex items-center">
                    {d}
                  </div>
                ))}
              </div>

              <div className="flex gap-[3px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }, (_, di) => {
                      const cell = week.find((c) => c.dow === di);
                      if (!cell) {
                        return <div key={di} className="h-2.5 w-2.5" />;
                      }
                      return (
                        <Tooltip key={di}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "h-2.5 w-2.5 rounded-sm transition-transform hover:scale-125 hover:ring-1 hover:ring-foreground/40 cursor-pointer",
                                LEVEL_BG[cell.level]
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="font-medium">
                              {cell.count} contribution{cell.count === 1 ? "" : "s"}
                            </span>{" "}
                            <span className="text-muted-foreground">on {cell.date}</span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </motion.section>
  );
}
