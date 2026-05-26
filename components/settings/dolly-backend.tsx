"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  HardDrive,
  Cpu,
  Check,
  Loader2,
  RefreshCw,
  CircleSlash,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDollyBackend, type DollyBackend } from "@/lib/dolly/backend-prefs";
import { cn } from "@/lib/utils";

type ProbeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; models: { name: string }[] }
  | { kind: "down"; error?: string };

const BACKENDS: {
  id: DollyBackend;
  label: string;
  description: string;
  Icon: typeof Cloud;
}[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Best available: Ollama if running, else Claude, else local rules.",
    Icon: Cpu,
  },
  {
    id: "claude",
    label: "Claude (Anthropic)",
    description: "Cloud LLM. Requires ANTHROPIC_API_KEY in your .env.local.",
    Icon: Cloud,
  },
  {
    id: "ollama",
    label: "Ollama (local LLM)",
    description: "100% offline. Requires Ollama installed and running.",
    Icon: HardDrive,
  },
  {
    id: "local",
    label: "Local rules engine",
    description: "Pattern-matching responder. No LLM. Fastest and most predictable.",
    Icon: CircleSlash,
  },
];

export function DollyBackendSelector() {
  const { prefs, set } = useDollyBackend();
  const [probe, setProbe] = useState<ProbeState>({ kind: "idle" });

  const checkOllama = async () => {
    setProbe({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/dolly/ollama-status?endpoint=${encodeURIComponent(
          prefs.ollamaEndpoint
        )}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setProbe({ kind: "down", error: `HTTP ${res.status}` });
        return;
      }
      const json = (await res.json()) as {
        ok: boolean;
        models: { name: string }[];
        error?: string;
      };
      if (json.ok) {
        setProbe({ kind: "ok", models: json.models });
        // Auto-select the first available model if the saved one isn't installed
        if (
          json.models.length > 0 &&
          !json.models.some((m) => m.name === prefs.ollamaModel)
        ) {
          set({ ollamaModel: json.models[0].name });
        }
      } else {
        setProbe({ kind: "down", error: json.error });
      }
    } catch (err) {
      setProbe({
        kind: "down",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  };

  // Auto-probe on mount + whenever the endpoint changes
  useEffect(() => {
    checkOllama();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.ollamaEndpoint]);

  return (
    <div className="space-y-5">
      {/* Backend picker */}
      <div>
        <p className="text-xs font-medium mb-2">Backend</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BACKENDS.map((b) => {
            const Icon = b.Icon;
            const selected = prefs.backend === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => set({ backend: b.id })}
                className={cn(
                  "group relative rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-emerald-400/50 bg-emerald-400/[0.06]"
                    : "border-foreground/[0.08] bg-background/30 hover:bg-accent/30"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-emerald-400/15 ring-1 ring-emerald-400/30"
                        : "bg-foreground/[0.06]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        selected ? "text-emerald-300" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{b.label}</span>
                      {selected && (
                        <Check className="h-3 w-3 text-emerald-300" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                      {b.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ollama config — only when ollama or auto is selected */}
      <AnimatePresence>
        {(prefs.backend === "ollama" || prefs.backend === "auto") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-foreground/[0.08] bg-background/30 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="h-3.5 w-3.5 text-emerald-300" />
                <p className="text-xs font-semibold">Ollama configuration</p>
                <OllamaBadge state={probe} />
                <button
                  onClick={checkOllama}
                  aria-label="Re-check Ollama status"
                  className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40"
                >
                  <RefreshCw
                    className={cn(
                      "h-3 w-3",
                      probe.kind === "loading" && "animate-spin"
                    )}
                  />
                </button>
              </div>

              <div>
                <label htmlFor="ollama-endpoint" className="text-[10px] text-muted-foreground">
                  Endpoint
                </label>
                <Input
                  id="ollama-endpoint"
                  value={prefs.ollamaEndpoint}
                  onChange={(e) => set({ ollamaEndpoint: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="mt-1 font-mono text-xs h-8"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground">
                  Model
                </label>
                {probe.kind === "ok" && probe.models.length > 0 ? (
                  <select
                    value={prefs.ollamaModel}
                    onChange={(e) => set({ ollamaModel: e.target.value })}
                    className="mt-1 w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs font-mono"
                  >
                    {probe.models.map((m) => (
                      <option key={m.name} value={m.name} className="bg-background">
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={prefs.ollamaModel}
                    onChange={(e) => set({ ollamaModel: e.target.value })}
                    placeholder="llama3.2"
                    className="mt-1 font-mono text-xs h-8"
                  />
                )}
              </div>

              <OllamaHelp state={probe} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OllamaBadge({ state }: { state: ProbeState }) {
  if (state.kind === "loading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-foreground/[0.08] bg-background/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Probing…
      </span>
    );
  }
  if (state.kind === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        Running · {state.models.length} model{state.models.length === 1 ? "" : "s"}
      </span>
    );
  }
  if (state.kind === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
        <span className="h-1 w-1 rounded-full bg-amber-400" />
        Not detected
      </span>
    );
  }
  return null;
}

function OllamaHelp({ state }: { state: ProbeState }) {
  if (state.kind !== "down") return null;
  return (
    <div className="text-[10px] text-muted-foreground leading-relaxed border-t border-foreground/[0.06] pt-3">
      <p className="font-medium text-foreground/80 mb-1">
        Ollama isn&apos;t responding at this endpoint.
      </p>
      <p>
        To enable offline LLM responses:
      </p>
      <ol className="list-decimal pl-4 mt-1 space-y-0.5">
        <li>
          Install:{" "}
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-emerald-300 hover:underline"
          >
            ollama.com/download
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </li>
        <li>
          Pull a model:{" "}
          <code className="font-mono text-foreground/80 bg-foreground/[0.05] px-1 rounded">
            ollama pull llama3.2
          </code>
        </li>
        <li>
          Run:{" "}
          <code className="font-mono text-foreground/80 bg-foreground/[0.05] px-1 rounded">
            ollama serve
          </code>{" "}
          (or just open the desktop app)
        </li>
        <li>Click the refresh icon above</li>
      </ol>
      <p className="mt-2 text-muted-foreground/70">
        Dolly will keep working in the meantime — it auto-falls-back to Claude
        or local rules.
      </p>
    </div>
  );
}
