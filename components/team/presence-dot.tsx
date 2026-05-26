import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/team-store";

const STATUS_BG: Record<PresenceStatus, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-muted-foreground/40",
};

const STATUS_RING: Record<PresenceStatus, string> = {
  online: "ring-emerald-400/50",
  away: "ring-amber-400/40",
  offline: "ring-muted-foreground/20",
};

export function PresenceDot({
  status,
  pulse = false,
  size = "default",
  className,
}: {
  status: PresenceStatus;
  pulse?: boolean;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const dimension =
    size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0",
        dimension,
        className
      )}
      aria-label={`presence: ${status}`}
    >
      {pulse && status === "online" && (
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-70",
            STATUS_BG[status]
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full ring-2 ring-background",
          dimension,
          STATUS_BG[status],
          STATUS_RING[status]
        )}
      />
    </span>
  );
}
