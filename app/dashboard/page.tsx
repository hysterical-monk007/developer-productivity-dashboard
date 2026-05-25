import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { PageHeader } from "@/components/dashboard/page-header";
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

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-6 lg:py-8 space-y-6">
              <PageHeader />
              <GithubBanner />

              {/* Metric cards row */}
              <MetricRow />

              {/* AI insights — premium real estate, above the fold */}
              <InsightsPanel delay={0.15} />

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <CommitsChart delay={0.2} />
                </div>
                <LanguageDonut delay={0.25} />
              </div>

              {/* Heatmap full-width */}
              <Heatmap delay={0.3} />

              {/* Second charts row + leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <PrIssueChart delay={0.35} />
                </div>
                <Leaderboard delay={0.4} />
              </div>

              {/* Bottom row: repo list + activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                  <RepoList delay={0.45} />
                </div>
                <div className="lg:col-span-2">
                  <ActivityFeed delay={0.5} />
                </div>
              </div>

              <footer className="pt-4 pb-2 text-center text-[11px] text-muted-foreground">
                Pulse · Developer Productivity Dashboard · demo data
              </footer>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
