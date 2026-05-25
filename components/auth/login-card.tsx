"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Github, Sparkles, ArrowRight, GitBranch, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, useRedirectIfAuthed } from "@/lib/auth";

export function LoginCard() {
  useRedirectIfAuthed();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      signIn();
      router.push("/dashboard");
    }, 650);
  };

  return (
    <div className="relative w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 shadow-2xl"
      >
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
              <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, developer.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Your AI-powered command center for commits, reviews, and shipping
            faster. Sign in to see your week at a glance.
          </p>

          <div className="mt-7">
            <Button
              size="lg"
              onClick={handleSignIn}
              disabled={loading}
              className="group w-full h-11 bg-foreground text-background hover:bg-foreground/90"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  Signing in…
                </>
              ) : (
                <>
                  <Github className="h-4 w-4" />
                  Continue with GitHub
                  <ArrowRight className="h-4 w-4 ml-auto transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Demo mode — no real GitHub auth. Click to enter the dashboard.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-background/40 p-3">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              <span className="font-medium">AI insights</span>
              <span className="text-muted-foreground text-[10px]">
                Auto-generated
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-background/40 p-3">
              <GitBranch className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-medium">Team view</span>
              <span className="text-muted-foreground text-[10px]">
                Leaderboard
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-background/40 p-3">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-medium">Realtime</span>
              <span className="text-muted-foreground text-[10px]">
                Activity feed
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        By continuing you agree to the (fictional) terms of this hackathon demo.
      </p>
    </div>
  );
}
