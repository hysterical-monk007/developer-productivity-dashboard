"use client";

import { MetricCard } from "./metric-card";
import { useGithubStats } from "@/lib/use-github-stats";

export function MetricRow() {
  const { metrics } = useGithubStats();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map((m, i) => (
        <MetricCard key={m.key} metric={m} index={i} />
      ))}
    </div>
  );
}
