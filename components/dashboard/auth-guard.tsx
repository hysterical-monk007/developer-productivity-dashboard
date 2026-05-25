"use client";

import { useRequireAuth } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const authed = useRequireAuth();

  if (authed === null || authed === false) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          Loading…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
