import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Round avatar showing the Dolly character image. Reused everywhere Dolly
 * appears — FAB, panel header, intro card, message bubbles.
 */
export function DollyAvatar({
  size = 32,
  className,
  halo = false,
  online = false,
}: {
  size?: number;
  className?: string;
  halo?: boolean;
  online?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      {halo && (
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full opacity-60 blur-[3px]"
          style={{
            background:
              "conic-gradient(from var(--angle, 0deg), #f472b6, #c084fc, #fb7185, #f472b6)",
            animation: "rotate-border 6s linear infinite",
          }}
        />
      )}
      <Image
        src="/dolly-avatar.png"
        alt="Dolly"
        width={size * 2}
        height={size * 2}
        priority
        className={cn(
          "relative rounded-full object-cover ring-2 ring-foreground/[0.08]",
          "shadow-md"
        )}
        style={{ width: size, height: size }}
      />
      {online && (
        <span className="absolute bottom-0 right-0 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
      )}
    </span>
  );
}
