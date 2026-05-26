"use client";

import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentMember } from "@/lib/team-store";
import { can, minRoleFor, type Permission } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/team-store";
import { cn } from "@/lib/utils";

/**
 * Wrap any interactive element. If the current user doesn't have the
 * required permission, the child is rendered with reduced opacity, pointer
 * events disabled, and a lock-icon tooltip explaining what role is needed.
 */
export function RoleGuard({
  permission,
  children,
  className,
}: {
  permission: Permission;
  children: React.ReactNode;
  className?: string;
}) {
  const me = useCurrentMember();
  const allowed = me ? can(me.role, permission) : false;

  if (allowed) {
    return <>{children}</>;
  }

  const required = minRoleFor(permission);
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-disabled="true"
            className={cn(
              "relative inline-flex cursor-not-allowed opacity-50 [&_*]:pointer-events-none [&_*]:!cursor-not-allowed",
              className
            )}
          >
            {children}
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-2 ring-background">
              <Lock className="h-2.5 w-2.5 text-amber-950" strokeWidth={3} />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <div className="font-medium">
            Requires {ROLE_LABEL[required]} role
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            Your current role:{" "}
            <span className="font-mono text-foreground/80">
              {me ? ROLE_LABEL[me.role] : "no role"}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
