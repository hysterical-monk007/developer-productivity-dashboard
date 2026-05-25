"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { currentUser } from "@/mock/user";
import { useGithub } from "@/lib/use-github";

function greeting(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Burning the midnight oil";
}

export function PageHeader() {
  const { linked, profile } = useGithub();

  // Display name resolution:
  //   1. Real GitHub display name (from profile.name, e.g. "Srinivas")
  //   2. GitHub login as a fallback (e.g. "hysterical-monk007")
  //   3. Mock persona (Alex Chen) if not linked
  const displayName =
    linked && profile
      ? (profile.name?.split(" ")[0]?.trim() || profile.login)
      : currentUser.name.split(" ")[0];

  const now = new Date();
  const formatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <p className="text-xs text-muted-foreground">{formatted}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
          {greeting(now.getHours())}, {displayName}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how your week is shaping up across all repos.
        </p>
      </div>
      <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-3 py-1.5 text-xs">
        <Sparkles className="h-3 w-3 text-violet-400" />
        <span className="text-violet-300">Insights regenerated 2 min ago</span>
      </div>
    </motion.div>
  );
}
