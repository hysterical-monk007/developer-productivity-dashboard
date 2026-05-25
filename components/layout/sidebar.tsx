"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Activity,
  Sparkles,
  Settings,
  HelpCircle,
  Zap,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  external?: boolean;
};

const primaryNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Repositories", href: "/dashboard#repos", icon: GitBranch },
  { label: "Activity", href: "/dashboard#activity", icon: Activity },
  { label: "Team", href: "/dashboard#team", icon: Users },
  {
    label: "AI Insights",
    href: "/dashboard#insights",
    icon: Sparkles,
    badge: "New",
  },
];

const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  {
    label: "Help & Docs",
    href: "https://github.com/anthropics",
    icon: HelpCircle,
    external: true,
  },
];

function smoothScrollToHash(href: string) {
  // Only intercept dashboard hash links when already on /dashboard
  if (!href.includes("#")) return false;
  const [path, hash] = href.split("#");
  if (typeof window === "undefined") return false;
  if (path && path !== window.location.pathname) return false;
  const el = document.getElementById(hash);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Update URL without router push (which would re-render)
  history.replaceState(null, "", `#${hash}`);
  return true;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href.startsWith("/dashboard#")) return pathname === "/dashboard";
    return pathname?.startsWith(href.split("#")[0] ?? "") ?? false;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow shadow-violet-500/30">
            <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight">Pulse</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <ChevronsRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronsLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          {!collapsed && (
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Workspace
            </p>
          )}
          <ul className="space-y-0.5">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    scroll={false}
                    onClick={(e) => {
                      if (smoothScrollToHash(item.href)) {
                        e.preventDefault();
                      }
                    }}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                      active && item.href === "/dashboard"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto inline-flex items-center rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-400">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="border-t border-border px-3 py-3 space-y-0.5">
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (item.external) {
            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
