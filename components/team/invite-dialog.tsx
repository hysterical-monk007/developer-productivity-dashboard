"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  UserPlus,
  X,
  Check,
  Search,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Github,
  MapPin,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeam, ROLE_LABEL, ROLE_DESCRIPTION, type Role } from "@/lib/team-store";
import { getGithubFetchHeaders } from "@/lib/use-github";
import { cn } from "@/lib/utils";

const ASSIGNABLE_ROLES: Role[] = ["admin", "editor", "viewer"];

type GhProfile = {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  publicRepos: number;
  followers: number;
  url: string;
};

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; profile: GhProfile }
  | { kind: "not_found" }
  | { kind: "rate_limited" }
  | { kind: "invalid" }
  | { kind: "error" };

export function InviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { invite } = useTeam();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupState>({ kind: "idle" });
  const [nameTouched, setNameTouched] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const reset = () => {
    setName("");
    setUsername("");
    setRole("editor");
    setError(null);
    setLookup({ kind: "idle" });
    setNameTouched(false);
  };

  // Debounced GitHub username lookup.
  useEffect(() => {
    const cleaned = username.trim().replace(/^@/, "");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cleaned.length === 0) {
      setLookup({ kind: "idle" });
      return;
    }
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(cleaned)) {
      setLookup({ kind: "invalid" });
      return;
    }

    setLookup({ kind: "loading" });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/github/lookup?username=${encodeURIComponent(cleaned)}`,
          { headers: getGithubFetchHeaders(), cache: "no-store" }
        );
        if (res.status === 404) {
          setLookup({ kind: "not_found" });
          return;
        }
        if (res.status === 429) {
          setLookup({ kind: "rate_limited" });
          return;
        }
        if (!res.ok) {
          setLookup({ kind: "error" });
          return;
        }
        const profile = (await res.json()) as GhProfile;
        setLookup({ kind: "found", profile });
        // Auto-fill the name field if the user hasn't manually typed yet
        if (!nameTouched && profile.name) {
          setName(profile.name);
        }
      } catch {
        setLookup({ kind: "error" });
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!username.trim()) {
      setError("GitHub username is required");
      return;
    }
    if (lookup.kind === "not_found") {
      setError(`No GitHub user named "@${username.trim().replace(/^@/, "")}" — double-check the handle.`);
      return;
    }
    const verified = lookup.kind === "found";
    invite({
      name: name.trim(),
      username: username.trim(),
      role,
      avatarUrl: verified ? lookup.profile.avatarUrl : undefined,
      bio: verified ? lookup.profile.bio ?? undefined : undefined,
      githubVerified: verified,
    });
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              reset();
              onClose();
            }}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              aria-label="Close dialog"
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-400/30">
                <UserPlus className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Invite a teammate
                </h2>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll verify their GitHub username as you type.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Username field with live lookup */}
              <div>
                <label
                  htmlFor="invite-username"
                  className="text-xs font-medium flex items-center gap-1.5"
                >
                  <Github className="h-3 w-3" />
                  GitHub username
                </label>
                <div className="mt-1.5 relative">
                  <Input
                    id="invite-username"
                    placeholder="e.g. octocat or @octocat"
                    value={username}
                    onChange={(e) => {
                      setError(null);
                      setUsername(e.target.value);
                    }}
                    className={cn(
                      "font-mono pr-9",
                      lookup.kind === "found" &&
                        "border-emerald-400/40 focus-visible:ring-emerald-400/40",
                      (lookup.kind === "not_found" ||
                        lookup.kind === "invalid") &&
                        "border-rose-400/40"
                    )}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {lookup.kind === "loading" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {lookup.kind === "found" && (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    {(lookup.kind === "not_found" ||
                      lookup.kind === "invalid") && (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                    )}
                  </span>
                </div>

                {/* Lookup status / preview */}
                <LookupResult state={lookup} />
              </div>

              {/* Name field */}
              <div>
                <label
                  htmlFor="invite-name"
                  className="text-xs font-medium"
                >
                  Display name
                  <span className="ml-1 text-muted-foreground">
                    {lookup.kind === "found"
                      ? "(auto-filled from GitHub)"
                      : ""}
                  </span>
                </label>
                <Input
                  id="invite-name"
                  placeholder="Jordan Kim"
                  value={name}
                  onChange={(e) => {
                    setError(null);
                    setNameTouched(true);
                    setName(e.target.value);
                  }}
                  className="mt-1.5"
                />
              </div>

              {/* Role picker */}
              <div>
                <label className="text-xs font-medium">Role</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "rounded-lg border p-2 text-left transition-colors",
                        role === r
                          ? "border-emerald-400/50 bg-emerald-400/10"
                          : "border-foreground/[0.08] bg-background/30 hover:bg-accent/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {ROLE_LABEL[r]}
                        </span>
                        {role === r && (
                          <Check className="h-3 w-3 text-emerald-300" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                        {ROLE_DESCRIPTION[r].split(".")[0]}.
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-[11px] text-rose-400 flex items-start gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    lookup.kind === "loading" ||
                    lookup.kind === "not_found" ||
                    lookup.kind === "invalid"
                  }
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add to team
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LookupResult({ state }: { state: LookupState }) {
  return (
    <AnimatePresence mode="popLayout">
      {state.kind === "found" && (
        <motion.div
          key="found"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] p-3"
        >
          <div className="flex items-start gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-emerald-400/40">
              <Image
                src={state.profile.avatarUrl}
                alt={state.profile.name}
                fill
                sizes="40px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">
                  {state.profile.name}
                </p>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                @{state.profile.login}
              </p>
              {state.profile.bio && (
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                  {state.profile.bio}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span>
                  <span className="font-semibold text-foreground/80 tabular-nums">
                    {state.profile.publicRepos}
                  </span>{" "}
                  repos
                </span>
                <span>·</span>
                <span>
                  <span className="font-semibold text-foreground/80 tabular-nums">
                    {state.profile.followers}
                  </span>{" "}
                  followers
                </span>
                {state.profile.company && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Building2 className="h-2.5 w-2.5" />
                      {state.profile.company}
                    </span>
                  </>
                )}
                {state.profile.location && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {state.profile.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {state.kind === "not_found" && (
        <motion.p
          key="nf"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1.5"
        >
          <AlertCircle className="h-3 w-3" />
          No GitHub user with that handle.
        </motion.p>
      )}

      {state.kind === "invalid" && (
        <motion.p
          key="inv"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1.5"
        >
          <AlertCircle className="h-3 w-3" />
          Not a valid GitHub username (letters, numbers, hyphens, max 39
          chars).
        </motion.p>
      )}

      {state.kind === "rate_limited" && (
        <motion.p
          key="rl"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-1.5 text-[11px] text-amber-400 flex items-center gap-1.5"
        >
          <AlertCircle className="h-3 w-3" />
          GitHub rate-limited the lookup. Connect your account in Settings
          for unlimited lookups, or just add the user without verification.
        </motion.p>
      )}

      {state.kind === "loading" && (
        <motion.p
          key="ld"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5"
        >
          <Search className="h-3 w-3 animate-pulse" />
          Looking up on GitHub…
        </motion.p>
      )}
    </AnimatePresence>
  );
}
