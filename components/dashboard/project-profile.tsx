"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Compass, FolderGit2, Sparkles, Github } from "lucide-react";
import { useGithub, getGithubFetchHeaders } from "@/lib/use-github";
import {
  buildProjectProfile,
  DOMAIN_LABEL,
  DOMAIN_EMOJI,
  type Domain,
  type ProfileResult,
} from "@/lib/ml/project-profile";
import { repos as mockRepos } from "@/mock/repos";
import { cn } from "@/lib/utils";

type RawRepo = {
  name: string;
  language?: string | null;
  description?: string | null;
};

const DOMAIN_BAR_COLOR: Record<Domain, string> = {
  "web-frontend": "bg-emerald-400/80",
  "web-backend": "bg-cyan-400/80",
  mobile: "bg-rose-400/80",
  infra: "bg-amber-400/80",
  "ai-ml": "bg-fuchsia-400/80",
  data: "bg-sky-400/80",
  "dev-tools": "bg-lime-400/80",
  systems: "bg-slate-400/80",
  games: "bg-orange-400/80",
  creative: "bg-pink-400/80",
  other: "bg-muted-foreground/60",
};

function renderMarkdown(text: string): React.ReactNode[] {
  // Lightweight: handles **bold** and `code` only.
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="font-mono text-[12px] text-foreground/90 bg-foreground/[0.06] rounded px-1"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function ProjectProfile({ delay = 0 }: { delay?: number }) {
  const { linked } = useGithub();
  const [repos, setRepos] = useState<RawRepo[]>([]);
  const [source, setSource] = useState<"mock" | "live">("mock");

  useEffect(() => {
    if (!linked) {
      setRepos(mockRepos.map((r) => ({ name: r.name, language: r.language, description: r.description })));
      setSource("mock");
      return;
    }
    let cancelled = false;
    fetch("/api/github/repos", {
      headers: getGithubFetchHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json: { repos: { name: string; language?: string; description?: string }[] }) => {
        if (cancelled) return;
        if (Array.isArray(json.repos) && json.repos.length > 0) {
          setRepos(
            json.repos.map((r) => ({
              name: r.name,
              language: r.language,
              description: r.description,
            }))
          );
          setSource("live");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRepos(mockRepos.map((r) => ({ name: r.name, language: r.language, description: r.description })));
          setSource("mock");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [linked]);

  const profile: ProfileResult = useMemo(() => buildProjectProfile(repos), [repos]);

  return (
    <motion.section
      id="project-profile"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="glass rounded-2xl p-6 scroll-mt-20 relative overflow-hidden"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl" />

      <header className="relative flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-emerald-300" />
            Project profile
            {source === "live" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                <Github className="h-2.5 w-2.5" />
                live
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-foreground/[0.08] bg-background/40 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
              <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
              auto-classified
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What you build, distilled from {profile.totalRepos} repo
            {profile.totalRepos === 1 ? "" : "s"} — language + keyword
            classification, weighted aggregation.
          </p>
        </div>
      </header>

      {/* Generated summary paragraph */}
      <p className="relative text-sm leading-relaxed text-foreground/90 mb-5">
        {renderMarkdown(profile.summary)}
      </p>

      {/* Domain bars */}
      {profile.domains.length > 0 && (
        <div className="relative space-y-3 mb-5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Domain breakdown
          </p>
          <ul className="space-y-2">
            {profile.domains.slice(0, 6).map((d, i) => (
              <motion.li
                key={d.domain}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span aria-hidden="true">{DOMAIN_EMOJI[d.domain]}</span>
                    {DOMAIN_LABEL[d.domain]}
                    <span className="text-muted-foreground font-normal text-[10px]">
                      · {d.count} repo{d.count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="text-muted-foreground tabular-nums text-[10px]">
                    {(d.share * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.share * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.15 + i * 0.05, ease: "easeOut" }}
                    className={cn("h-full rounded-full", DOMAIN_BAR_COLOR[d.domain])}
                  />
                </div>
                {d.repos.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.repos.slice(0, 5).map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center rounded border border-foreground/[0.08] bg-background/40 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                      >
                        {r}
                      </span>
                    ))}
                    {d.repos.length > 5 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{d.repos.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Languages */}
      {profile.languageBreakdown.length > 0 && (
        <div className="relative">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Languages
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.languageBreakdown.slice(0, 8).map((l) => (
              <span
                key={l.language}
                className="inline-flex items-center gap-1.5 rounded-md border border-foreground/[0.08] bg-background/40 px-2 py-0.5 text-[10px]"
              >
                <span className="font-medium">{l.language}</span>
                <span className="text-muted-foreground tabular-nums">
                  {(l.share * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative mt-5 pt-3 border-t border-foreground/[0.06] flex items-center gap-2 text-[10px] text-muted-foreground">
        <FolderGit2 className="h-3 w-3" />
        Classifier: language + keyword scoring · {profile.domains.length}{" "}
        domain{profile.domains.length === 1 ? "" : "s"} detected ·{" "}
        runs in browser
      </div>
    </motion.section>
  );
}
