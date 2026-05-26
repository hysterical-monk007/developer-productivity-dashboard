"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { Hero } from "@/components/dashboard/hero";
import { GithubBanner } from "@/components/dashboard/github-banner";
import { MetricRow } from "@/components/dashboard/metric-row";
import { CommitsChart } from "@/components/dashboard/commits-chart";
import { PrIssueChart } from "@/components/dashboard/pr-issue-chart";
import { LanguageDonut } from "@/components/dashboard/language-donut";
import { Heatmap } from "@/components/dashboard/heatmap";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Leaderboard } from "@/components/dashboard/leaderboard";
import { RepoList } from "@/components/dashboard/repo-list";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { MLStack } from "@/components/dashboard/ml-stack";
import { ProjectProfile } from "@/components/dashboard/project-profile";
import { AuroraBackground } from "@/components/effects/aurora";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import { DollyFab } from "@/components/dolly/dolly-fab";
import { GithubTeamAnchor } from "@/components/team/github-team-anchor";
import { useTeam, useCurrentMember } from "@/lib/team-store";
import { useChat } from "@/lib/chat-store";

export default function DashboardPage() {
  const { team } = useTeam();
  const me = useCurrentMember();
  const meId = me?.id ?? "";
  const otherIds = team.filter((m) => m.id !== meId).map((m) => m.id);
  const { unreadCount } = useChat(meId, otherIds);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="relative flex h-screen overflow-hidden bg-background">
        <AuroraBackground />
        <Sidebar />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <Topbar
            chatUnreadCount={unreadCount}
            onOpenChat={() => setChatOpen(true)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8 lg:py-12 space-y-8">
              <Hero />
              <GithubBanner />

              {/* Metric cards row */}
              <MetricRow />

              {/* AI insights — premium real estate, above the fold */}
              <InsightsPanel delay={0.15} />

              {/* Project profile — automated analysis of what user builds */}
              <ProjectProfile delay={0.17} />

              {/* ML stack — what's actually running */}
              <MLStack delay={0.2} />

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <CommitsChart delay={0.2} />
                </div>
                <LanguageDonut delay={0.25} />
              </div>

              {/* Heatmap full-width */}
              <Heatmap delay={0.3} />

              {/* Second charts row + leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <PrIssueChart delay={0.35} />
                </div>
                <Leaderboard delay={0.4} />
              </div>

              {/* Bottom row: repo list + activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1">
                  <RepoList delay={0.45} />
                </div>
                <div className="lg:col-span-2">
                  <ActivityFeed delay={0.5} />
                </div>
              </div>

              <footer className="pt-6 pb-2 text-center text-[11px] text-muted-foreground/70">
                Pulse · Crafted with care · {new Date().getFullYear()}
              </footer>
            </div>
          </main>
        </div>

        <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
        <DollyFab />
        <GithubTeamAnchor />
      </div>
    </AuthGuard>
  );
}
