import { Crown, Shield, Pencil, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Role } from "@/lib/team-store";

const ROLE_STYLE: Record<Role, string> = {
  owner: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  admin: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  editor: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  viewer: "border-foreground/15 bg-foreground/5 text-muted-foreground",
};

const ROLE_ICON: Record<Role, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  editor: Pencil,
  viewer: Eye,
};

export function RoleBadge({
  role,
  className,
}: {
  role: Role;
  className?: string;
}) {
  const Icon = ROLE_ICON[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
        ROLE_STYLE[role],
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {ROLE_LABEL[role]}
    </span>
  );
}
