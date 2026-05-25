"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signIn as nextAuthSignIn } from "next-auth/react";
import {
  Github,
  Check,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Loader2,
  Unplug,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGithub } from "@/lib/use-github";

type Props = { oauthEnabled: boolean };

export function GithubConnect({ oauthEnabled }: Props) {
  const { linked, source, profile, loading, error, connectPat, disconnect } =
    useGithub();
  const [pat, setPat] = useState("");
  const [showPatInput, setShowPatInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePat = async () => {
    setLocalError(null);
    if (!pat || pat.length < 20) {
      setLocalError(
        "That doesn't look like a valid token (expected a long string starting with `ghp_` or `github_pat_`)."
      );
      return;
    }
    setSubmitting(true);
    const ok = await connectPat(pat);
    setSubmitting(false);
    if (!ok) {
      setLocalError(
        "GitHub rejected the token. Make sure it has read:user, repo, and read:org scopes."
      );
    } else {
      setPat("");
      setShowPatInput(false);
    }
  };

  if (linked && profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-emerald-500/30">
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">{profile.name}</p>
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                <Check className="h-2.5 w-2.5" />
                Connected
              </span>
              <span className="rounded border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                via {source === "pat" ? "PAT" : "OAuth"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">@{profile.login}</p>
            {profile.bio && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {profile.bio}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {profile.publicRepos}
                </span>{" "}
                repos
              </span>
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {profile.followers}
                </span>{" "}
                followers
              </span>
              <span>
                <span className="font-semibold text-foreground tabular-nums">
                  {profile.following}
                </span>{" "}
                following
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            className="shrink-0 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Unplug className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pulse is now reading your real GitHub data. Your dashboard widgets
          show live commits, repos, and contributions. Token is stored
          locally in your browser only.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {!showPatInput && (
        <div className="flex flex-col gap-3">
          {oauthEnabled ? (
            <Button
              size="lg"
              onClick={() =>
                nextAuthSignIn("github", {
                  callbackUrl: "/dashboard/settings#github",
                })
              }
              className="w-full sm:w-auto h-11 bg-foreground text-background hover:bg-foreground/90"
            >
              <Github className="h-4 w-4" />
              Sign in with GitHub
            </Button>
          ) : (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs">
              <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                OAuth not configured
              </p>
              <p className="mt-1 text-muted-foreground">
                Set <code className="font-mono text-foreground/80">GITHUB_CLIENT_ID</code>{" "}
                and{" "}
                <code className="font-mono text-foreground/80">GITHUB_CLIENT_SECRET</code>{" "}
                in <code className="font-mono text-foreground/80">.env.local</code> to
                enable Sign in with GitHub.{" "}
                <a
                  href="https://github.com/settings/applications/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-foreground underline-offset-2 hover:underline"
                >
                  Register an OAuth app
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                with callback{" "}
                <code className="font-mono text-foreground/80">
                  http://localhost:3001/api/auth/callback/github
                </code>
                .
              </p>
            </div>
          )}

          <button
            onClick={() => setShowPatInput(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left inline-flex items-center gap-1.5"
          >
            <KeyRound className="h-3 w-3" />
            Use a Personal Access Token instead →
          </button>
        </div>
      )}

      {showPatInput && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="pat" className="text-xs font-medium">
              Personal Access Token
            </label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Create one at{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=read:user,repo,read:org&description=Pulse%20Dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline-offset-2 hover:underline"
              >
                github.com/settings/tokens/new
              </a>{" "}
              with scopes:{" "}
              <code className="font-mono text-foreground/80">read:user</code>,{" "}
              <code className="font-mono text-foreground/80">repo</code>,{" "}
              <code className="font-mono text-foreground/80">read:org</code>.
            </p>
            <Input
              id="pat"
              type="password"
              placeholder="ghp_… or github_pat_…"
              value={pat}
              onChange={(e) => {
                setLocalError(null);
                setPat(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePat();
              }}
              className="mt-2 font-mono text-xs"
              disabled={submitting}
            />
          </div>
          {(localError || error) && (
            <div className="flex items-start gap-1.5 text-[11px] text-rose-400">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>{localError ?? error}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePat}
              disabled={submitting || !pat}
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {submitting ? "Validating…" : "Connect"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPatInput(false);
                setPat("");
                setLocalError(null);
              }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Your token never leaves your browser except to call GitHub via our
            server proxy.
          </p>
        </motion.div>
      )}

      {loading && !linked && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking connection…
        </p>
      )}
    </div>
  );
}
