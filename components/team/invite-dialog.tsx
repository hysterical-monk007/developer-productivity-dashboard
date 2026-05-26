"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeam, ROLE_LABEL, ROLE_DESCRIPTION, type Role } from "@/lib/team-store";
import { cn } from "@/lib/utils";

const ASSIGNABLE_ROLES: Role[] = ["admin", "editor", "viewer"];

export function InviteDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { invite } = useTeam();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setUsername("");
    setRole("editor");
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!username.trim()) {
      setError("GitHub username (or any handle) is required");
      return;
    }
    invite({ name: name.trim(), username: username.trim(), role });
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              reset();
              onClose();
            }}
            className="absolute inset-0 bg-background/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-6"
          >
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              aria-label="Close dialog"
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-400/30">
                <UserPlus className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Invite a teammate
                </h2>
                <p className="text-xs text-muted-foreground">
                  They&apos;ll appear instantly in the team list.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="invite-name"
                  className="text-xs font-medium"
                >
                  Display name
                </label>
                <Input
                  id="invite-name"
                  placeholder="Jordan Kim"
                  value={name}
                  onChange={(e) => {
                    setError(null);
                    setName(e.target.value);
                  }}
                  className="mt-1.5"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-username"
                  className="text-xs font-medium"
                >
                  GitHub username (or any handle)
                </label>
                <Input
                  id="invite-username"
                  placeholder="@jordan-k"
                  value={username}
                  onChange={(e) => {
                    setError(null);
                    setUsername(e.target.value);
                  }}
                  className="mt-1.5 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Role</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {ASSIGNABLE_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={cn(
                        "rounded-lg border p-2 text-left transition-colors",
                        role === r
                          ? "border-emerald-400/50 bg-emerald-400/10"
                          : "border-foreground/[0.08] bg-background/30 hover:bg-accent/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {ROLE_LABEL[r]}
                        </span>
                        {role === r && (
                          <Check className="h-3 w-3 text-emerald-300" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                        {ROLE_DESCRIPTION[r].split(".")[0]}.
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-[11px] text-rose-400">{error}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reset();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add to team
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
