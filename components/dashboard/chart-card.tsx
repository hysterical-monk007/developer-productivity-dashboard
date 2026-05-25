"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  subtitle,
  toolbar,
  children,
  className,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "glass rounded-2xl p-6 scroll-mt-20",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {toolbar && <div className="shrink-0">{toolbar}</div>}
      </header>
      <div className="relative">{children}</div>
    </motion.section>
  );
}
