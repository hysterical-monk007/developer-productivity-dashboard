import Link from "next/link";
import { ArrowLeft, User, Palette, Github, Bell } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import {
  SettingsSection,
  SettingsRow,
} from "@/components/settings/section";
import { GithubConnect } from "@/components/settings/github-connect";
import { AppearanceToggle } from "@/components/settings/appearance-toggle";
import { NotificationToggles } from "@/components/settings/notification-toggles";
import { HAS_OAUTH } from "@/auth";
import { currentUser } from "@/mock/user";

const NAV = [
  { label: "Profile", href: "#profile", Icon: User },
  { label: "Appearance", href: "#appearance", Icon: Palette },
  { label: "GitHub", href: "#github", Icon: Github },
  { label: "Notifications", href: "#notifications", Icon: Bell },
];

export default function SettingsPage() {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-6 lg:py-8 space-y-6">
              <div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to dashboard
                </Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  Settings
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manage your account, theme, integrations, and notifications.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
                {/* Settings nav rail */}
                <nav className="hidden lg:block">
                  <ul className="sticky top-20 space-y-1 text-sm">
                    {NAV.map((n) => {
                      const Icon = n.Icon;
                      return (
                        <li key={n.label}>
                          <a
                            href={n.href}
                            className="group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {n.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <div className="space-y-6">
                  {/* Profile */}
                  <SettingsSection
                    id="profile"
                    title="Profile"
                    description="Your display identity in the Pulse dashboard."
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${currentUser.avatarColor} text-lg font-semibold text-white shadow-lg shadow-violet-500/20`}
                      >
                        {currentUser.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{currentUser.username} · {currentUser.role}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {currentUser.bio}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] text-muted-foreground">
                      Demo identity. Connect GitHub below to use your real
                      profile.
                    </p>
                  </SettingsSection>

                  {/* Appearance */}
                  <SettingsSection
                    id="appearance"
                    title="Appearance"
                    description="Choose how Pulse looks. System matches your OS preference."
                  >
                    <SettingsRow
                      label="Theme"
                      description="Switches between dark and light. Persists across sessions."
                    >
                      <AppearanceToggle />
                    </SettingsRow>
                  </SettingsSection>

                  {/* GitHub */}
                  <SettingsSection
                    id="github"
                    title="GitHub integration"
                    description="Link your GitHub account to see real commits, repos, and contributions."
                  >
                    <GithubConnect oauthEnabled={HAS_OAUTH} />
                  </SettingsSection>

                  {/* Notifications */}
                  <SettingsSection
                    id="notifications"
                    title="Notifications"
                    description="Pick what you want to hear about. Saved to your browser."
                  >
                    <NotificationToggles />
                  </SettingsSection>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
