"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  LogOut,
  User,
  Command,
  Plus,
  Settings as SettingsIcon,
  Github,
  Link2,
  MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { signOut } from "@/lib/auth";
import { useGithub } from "@/lib/use-github";
import { currentUser } from "@/mock/user";

type TopbarProps = {
  chatUnreadCount?: number;
  onOpenChat?: () => void;
};

export function Topbar({ chatUnreadCount = 0, onOpenChat }: TopbarProps = {}) {
  const router = useRouter();
  const { linked, profile, source, disconnect } = useGithub();

  const handleSignOut = async () => {
    await disconnect();
    signOut();
    router.replace("/");
  };

  const displayName = linked && profile ? profile.name : currentUser.name;
  const handle = linked && profile ? profile.login : currentUser.username;
  const firstName = displayName.split(" ")[0];

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-foreground/[0.06] bg-background/40 backdrop-blur-2xl px-4 lg:px-6">
      <div className="flex-1 max-w-md relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repos, PRs, teammates…"
          className="pl-9 pr-12 h-9 bg-secondary/50 border-border/60"
        />
        <kbd className="pointer-events-none hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {linked && profile ? (
          <Link
            href="/dashboard/settings#github"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/[0.08] px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/15 transition-colors"
            title={`Connected via ${source === "pat" ? "PAT" : "OAuth"}`}
          >
            <Github className="h-3 w-3" />
            <span className="hidden md:inline">@{profile.login}</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/settings#github"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <Link2 className="h-3 w-3" />
            Link GitHub
          </Link>
        )}

        <Button
          size="sm"
          variant="outline"
          className="hidden sm:inline-flex h-9 gap-1.5 border-border/60"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">New</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Messages"
          onClick={onOpenChat}
          className="relative h-9 w-9 rounded-full border border-foreground/[0.08] bg-background/40 hover:bg-accent"
        >
          <MessageSquare className="h-4 w-4" />
          {chatUnreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-emerald-950 ring-2 ring-background">
              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-full border border-foreground/[0.08] bg-background/40 hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
        </Button>
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 p-0.5 pr-3 hover:bg-accent transition-colors">
              <Avatar className="h-7 w-7">
                {linked && profile ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.name}
                    width={28}
                    height={28}
                    unoptimized
                    className="aspect-square h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback
                    className={`bg-gradient-to-br ${currentUser.avatarColor} text-white font-semibold`}
                  >
                    {currentUser.avatar}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="hidden sm:inline text-xs font-medium">
                {firstName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">@{handle}</span>
                {linked && (
                  <span className="mt-1 inline-flex items-center gap-1 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                    <Github className="h-2.5 w-2.5" />
                    GitHub connected
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings#profile">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-rose-500 focus:text-rose-500"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
