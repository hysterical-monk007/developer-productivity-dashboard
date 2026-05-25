import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  "relative rounded-2xl text-card-foreground transition-shadow",
  {
    variants: {
      variant: {
        default: "glass",
        strong: "glass-strong",
        plain:
          "bg-card border border-border shadow-sm",
      },
      glow: {
        none: "",
        emerald:
          "before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_top_right,hsl(var(--chart-1)/0.15),transparent_50%)] before:pointer-events-none",
        coral:
          "before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_top_right,hsl(var(--chart-2)/0.15),transparent_50%)] before:pointer-events-none",
      },
      interactive: {
        true: "transition-transform hover:-translate-y-0.5 hover:shadow-lg",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      glow: "none",
      interactive: false,
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, glow, interactive, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(glassCardVariants({ variant, glow, interactive }), className)}
      {...props}
    >
      {children}
    </div>
  )
);
GlassCard.displayName = "GlassCard";
