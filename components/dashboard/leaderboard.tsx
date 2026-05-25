"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { team } from "@/mock/team";
import { cn } from "@/lib/utils";

export function Leaderboard({ delay = 0 }: { delay?: number }) {
  const sorted = [...team].sort((a, b) => b.commits - a.commits);
  const max = sorted[0].commits;

  return (
    <motion.section
      id="team"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="glass rounded-2xl p-6 scroll-mt-20"
    >
      <header className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            Team leaderboard
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Commits, last 30 days</p>
        </div>
        <span className="inline-flex items-center rounded-md border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium">
          {sorted.length} members
        </span>
      </header>

      <ul className="space-y-2.5">
        {sorted.map((member, i) => {
          const pct = (member.commits / max) * 100;
          const isTop = i === 0;
          return (
            <li
              key={member.id}
              className={cn(
                "group relative rounded-lg border p-2.5 transition-colors",
                isTop
                  ? "border-amber-500/30 bg-amber-500/[0.04]"
                  : "border-border/60 bg-background/40 hover:bg-accent/40"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                    isTop ? "bg-amber-500 text-amber-950" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={`bg-gradient-to-br ${member.avatarColor} text-white text-[10px] font-semibold`}>
                    {member.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      @{member.username}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{member.role}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums">{member.commits}</div>
                  <div
                    className={cn(
                      "flex items-center justify-end gap-0.5 text-[10px] font-semibold",
                      member.delta >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}
                  >
                    {member.delta >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {member.delta >= 0 ? "+" : ""}
                    {member.delta}%
                  </div>
                </div>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    isTop
                      ? "bg-gradient-to-r from-amber-400 to-amber-500"
                      : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  )}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
