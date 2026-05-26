"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Users, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthGuard } from "@/components/dashboard/auth-guard";
import { AuroraBackground } from "@/components/effects/aurora";
import { TeamGrid } from "@/components/team/team-grid";
import { InviteDialog } from "@/components/team/invite-dialog";
import { RoleGuard } from "@/components/team/role-guard";
import { Button } from "@/components/ui/button";
import { useTeam, useCurrentMember } from "@/lib/team-store";
import { useChat } from "@/lib/chat-store";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import { DollyFab } from "@/components/dolly/dolly-fab";

export default function TeamPage() {
  const { team, reset } = useTeam();
  const me = useCurrentMember();
  const meId = me?.id ?? "";
  const otherIds = team.filter((m) => m.id !== meId).map((m) => m.id);
  const { unreadCount } = useChat(meId, otherIds);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const handleOpenChat = (threadId: string) => {
    setActiveThreadId(threadId);
    setChatOpen(true);
  };

  const counts = {
    total: team.length,
    online: team.length, // presence map is per-render; this is a placeholder shown in summary
  };

  return (
    <AuthGuard>
      <div className="relative flex h-screen overflow-hidden bg-background">
        <AuroraBackground intensity="subtle" />
        <Sidebar />
        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <Topbar
            chatUnreadCount={unreadCount}
            onOpenChat={() => setChatOpen(true)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 lg:py-12 space-y-6">
              <div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to dashboard
                </Link>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                      Team
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Invite teammates, assign roles, message anyone with a
                      click. Presence updates live.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={reset}
                      className="text-muted-foreground"
                      title="Reset team to default seed (useful for demo)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </Button>
                    <RoleGuard permission="invite_member">
                      <Button
                        size="sm"
                        onClick={() => setInviteOpen(true)}
                        className="bg-foreground text-background hover:bg-foreground/90"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Invite teammate
                      </Button>
                    </RoleGuard>
                  </div>
                </div>
              </div>

              {/* Summary strip */}
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-emerald-300" />
                  <span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {counts.total}
                    </span>{" "}
                    member{counts.total === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>
                    Roles you control:{" "}
                    <span className="font-mono text-foreground/80">
                      owner, admin, editor, viewer
                    </span>
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>
                    Presence simulated locally · no real-time backend required
                  </span>
                </div>
              </div>

              <TeamGrid onOpenChat={handleOpenChat} />
            </div>
          </main>
        </div>

        <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
        <ChatDrawer
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          initialThreadId={activeThreadId}
        />
        <DollyFab />
      </div>
    </AuthGuard>
  );
}
