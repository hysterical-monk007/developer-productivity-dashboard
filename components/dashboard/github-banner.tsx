"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";

const DISMISS_KEY = "devdash_banner_dismissed";

export function GithubBanner() {
  const { linked, profile, source } = useGithub();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accessibleRepoCount, setAccessibleRepoCount] = useState<number | null>(
    null
  );

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (!linked) {
      setAccessibleRepoCount(null);
      return;
    }
    let cancelled = false;
    fetch("/api/github/repos", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { repos: unknown[] }) => {
        if (cancelled) return;
        if (Array.isArray(json.repos)) {
          setAccessibleRepoCount(json.repos.length);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [linked]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  return (
    <AnimatePresence>
      {mounted && linked && profile && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent p-4"
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-emerald-500/40">
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">
                  Connected as @{profile.login}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <Check className="h-2.5 w-2.5" />
                  Live
                </span>
                <span className="hidden sm:inline rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  via {source === "pat" ? "PAT" : "OAuth"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <Github className="inline-block h-3 w-3 mr-1 -mt-0.5" />
                Pulse is reading your real GitHub data. Metric cards, the
                commits chart, repository list, contribution heatmap, and
                activity feed are showing live values
                {accessibleRepoCount !== null && accessibleRepoCount > 0 && (
                  <>
                    {" "}
                    across{" "}
                    <span className="font-medium text-foreground/80">
                      {accessibleRepoCount}
                    </span>{" "}
                    repo{accessibleRepoCount === 1 ? "" : "s"}
                  </>
                )}
                .
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/settings#github"
                className="rounded-md border border-border bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Manage
              </Link>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
