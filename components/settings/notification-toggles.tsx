"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Pref = {
  key: string;
  label: string;
  description: string;
  defaultOn: boolean;
};

const PREFS: Pref[] = [
  {
    key: "pr_assigned",
    label: "PR assignments",
    description: "Email me when someone assigns me a pull request to review.",
    defaultOn: true,
  },
  {
    key: "pr_merged",
    label: "PR merged",
    description: "Email when one of my PRs gets merged.",
    defaultOn: true,
  },
  {
    key: "weekly_summary",
    label: "Weekly summary",
    description: "Send a Monday morning digest of last week's activity.",
    defaultOn: true,
  },
  {
    key: "ai_alerts",
    label: "AI anomaly alerts",
    description:
      "Notify me when Pulse detects a significant anomaly in my activity (±2σ or more).",
    defaultOn: false,
  },
];

const STORAGE_KEY = "devdash_prefs";

function readPrefs(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        on ? "bg-emerald-500" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
          on ? "translate-x-[18px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

export function NotificationToggles() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readPrefs();
    const init: Record<string, boolean> = {};
    for (const p of PREFS) {
      init[p.key] = stored[p.key] ?? p.defaultOn;
    }
    setPrefs(init);
    setMounted(true);
  }, []);

  const update = (key: string, on: boolean) => {
    const next = { ...prefs, [key]: on };
    setPrefs(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  if (!mounted) {
    return <div className="h-32 animate-pulse rounded-md bg-muted/30" />;
  }

  return (
    <ul className="divide-y divide-border/60">
      {PREFS.map((p) => (
        <li key={p.key} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{p.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {p.description}
            </p>
          </div>
          <Toggle on={prefs[p.key] ?? false} onChange={(v) => update(p.key, v)} />
        </li>
      ))}
    </ul>
  );
}
