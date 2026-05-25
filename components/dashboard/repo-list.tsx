"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, GitFork, Lock, Globe, Github } from "lucide-react";
import { repos as mockRepos, type Repo } from "@/mock/repos";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";

export function RepoList({ delay = 0 }: { delay?: number }) {
  const { linked } = useGithub();
  const [repos, setRepos] = useState<Repo[]>(mockRepos);
  const [source, setSource] = useState<"mock" | "live">("mock");

  useEffect(() => {
    if (!linked) {
      setRepos(mockRepos);
      setSource("mock");
      return;
    }
    let cancelled = false;
    fetch("/api/github/repos", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { repos: Repo[] }) => {
        if (cancelled) return;
        if (Array.isArray(json.repos) && json.repos.length > 0) {
          setRepos(json.repos);
          setSource("live");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRepos(mockRepos);
          setSource("mock");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  return (
    <motion.section
      id="repos"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card p-5 shadow-sm scroll-mt-20"
    >
      <header className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            Active repositories
            {source === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                <Github className="h-2.5 w-2.5" />
                live
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {source === "live"
              ? "Your most recently pushed repos"
              : "Most active in the last 7 days"}
          </p>
        </div>
        <button className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          View all →
        </button>
      </header>

      <ul className="divide-y divide-border/60">
        {repos.map((r, idx) => (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
            className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium font-mono truncate">
                  {r.name}
                </span>
                {r.isPrivate ? (
                  <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                  <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {r.description}
              </p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: r.languageColor }}
                  />
                  {r.language}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-2.5 w-2.5" />
                  {r.stars}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-2.5 w-2.5" />
                  {r.forks}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold tabular-nums">
                {r.commitsThisWeek}
              </div>
              <div className="text-[10px] text-muted-foreground">commits/wk</div>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
