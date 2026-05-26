"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MoreVertical,
  MessageSquare,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PresenceDot } from "./presence-dot";
import { RoleBadge } from "./role-badge";
import { RoleGuard } from "./role-guard";
import {
  useTeam,
  useCurrentMember,
  ROLE_LABEL,
  type Role,
  type TeamMember,
} from "@/lib/team-store";
import { usePresence } from "@/lib/presence-engine";
import { useChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

const ASSIGNABLE_ROLES: Role[] = ["owner", "admin", "editor", "viewer"];

type Props = {
  onOpenChat?: (threadId: string) => void;
};

export function TeamGrid({ onOpenChat }: Props) {
  const { team, changeRole, remove } = useTeam();
  const me = useCurrentMember();
  const presence = usePresence(team.map((m) => m.id));
  const meId = me?.id ?? "";
  const others = team.filter((m) => m.id !== meId).map((m) => m.id);
  const { startDM } = useChat(meId, others);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleStartDM = (id: string) => {
    if (!meId || id === meId) return;
    const threadId = startDM(id);
    onOpenChat?.(threadId);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {team.map((member, i) => (
        <MemberCard
          key={member.id}
          member={member}
          isCurrent={member.id === meId}
          presenceStatus={presence[member.id]?.status ?? "offline"}
          presenceTyping={presence[member.id]?.isTyping ?? false}
          lastSeen={presence[member.id]?.lastSeen ?? "0m"}
          index={i}
          onMessage={() => handleStartDM(member.id)}
          onChangeRole={(r) => changeRole(member.id, r)}
          onRemove={() => setConfirmRemove(member.id)}
        />
      ))}

      {/* Inline confirm-remove modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setConfirmRemove(null)}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />
          <div className="glass-strong relative z-10 w-full max-w-sm rounded-2xl p-6">
            <h3 className="text-sm font-semibold">Remove from team?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              They&apos;ll lose access immediately. You can re-invite them later
              if you change your mind.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-accent/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  remove(confirmRemove);
                  setConfirmRemove(null);
                }}
                className="rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500/90"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  isCurrent,
  presenceStatus,
  presenceTyping,
  lastSeen,
  index,
  onMessage,
  onChangeRole,
  onRemove,
}: {
  member: TeamMember;
  isCurrent: boolean;
  presenceStatus: "online" | "away" | "offline";
  presenceTyping: boolean;
  lastSeen: string;
  index: number;
  onMessage: () => void;
  onChangeRole: (role: Role) => void;
  onRemove: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="glass rounded-2xl p-4 relative overflow-hidden transition-shadow hover:shadow-xl"
    >
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback
              className={`bg-gradient-to-br ${member.avatarColor} text-white text-xs font-semibold`}
            >
              {member.avatar}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5">
            <PresenceDot status={presenceStatus} pulse size="sm" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold truncate">
              {member.name}
              {isCurrent && (
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  (you)
                </span>
              )}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono truncate">
            @{member.username}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <RoleBadge role={member.role} />
            <span className="text-[10px] text-muted-foreground">
              {presenceTyping ? (
                <span className="text-emerald-300">typing…</span>
              ) : presenceStatus === "online" ? (
                "active now"
              ) : (
                `${lastSeen} ago`
              )}
            </span>
          </div>
        </div>

        {!isCurrent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Member options"
                className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onMessage}>
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Change role
              </DropdownMenuLabel>
              {ASSIGNABLE_ROLES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onChangeRole(r)}
                  className={
                    member.role === r ? "bg-accent/40" : ""
                  }
                >
                  <RoleBadge role={r} />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRemove}
                className="text-rose-400 focus:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="relative mt-4 grid grid-cols-3 gap-2 text-[10px] text-muted-foreground border-t border-foreground/[0.06] pt-3">
        <div>
          <div className="font-semibold tabular-nums text-foreground/90 text-sm">
            {member.commits}
          </div>
          commits
        </div>
        <div>
          <div className="font-semibold tabular-nums text-foreground/90 text-sm">
            {member.prsMerged}
          </div>
          PRs merged
        </div>
        <div>
          <div className="font-semibold tabular-nums text-foreground/90 text-sm">
            {member.reviewsGiven}
          </div>
          reviews
        </div>
      </div>
    </motion.article>
  );
}
