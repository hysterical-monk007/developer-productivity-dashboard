"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "./chart-card";
import { languageBreakdown } from "@/mock/timeseries";

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
        {d.name}
      </div>
      <div className="mt-0.5 text-muted-foreground">{d.value}% of commits</div>
    </div>
  );
}

export function LanguageDonut({ delay = 0 }: { delay?: number }) {
  return (
    <ChartCard
      title="Languages"
      subtitle="Distribution by commits"
      delay={delay}
    >
      <div className="flex items-center gap-4">
        <div className="h-[180px] w-[180px] shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={languageBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {languageBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Top
            </span>
            <span className="text-lg font-semibold tracking-tight">TS</span>
            <span className="text-[11px] text-muted-foreground">42%</span>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5 min-w-0">
          {languageBreakdown.map((l) => (
            <li
              key={l.name}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: l.color }}
              />
              <span className="truncate font-medium">{l.name}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {l.value}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
