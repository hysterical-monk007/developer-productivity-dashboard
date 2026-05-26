import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/team-store";

/**
 * Avatar that renders the member's real GitHub photo when available, with a
 * graceful fallback to colored initials. One place to change if we ever
 * want to layer presence dots or verified badges across the whole app.
 */
export function MemberAvatar({
  member,
  size = 32,
  className,
}: {
  member: Pick<TeamMember, "avatar" | "avatarColor" | "name" | "avatarUrl">;
  size?: number;
  className?: string;
}) {
  if (member.avatarUrl) {
    return (
      <span
        className={cn(
          "relative inline-block overflow-hidden rounded-full ring-1 ring-foreground/[0.08]",
          className
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src={member.avatarUrl}
          alt={member.name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </span>
    );
  }
  return (
    <Avatar className={cn(className)} style={{ width: size, height: size }}>
      <AvatarFallback
        className={cn(
          `bg-gradient-to-br ${member.avatarColor} text-white font-semibold`
        )}
        style={{
          fontSize: size < 24 ? "8px" : size < 32 ? "10px" : "12px",
        }}
      >
        {member.avatar}
      </AvatarFallback>
    </Avatar>
  );
}
