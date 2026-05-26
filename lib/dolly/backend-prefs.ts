"use client";

import { useEffect, useState } from "react";

export type DollyBackend = "auto" | "claude" | "ollama" | "local";

export type DollyBackendPrefs = {
  backend: DollyBackend;
  ollamaEndpoint: string;
  ollamaModel: string;
};

const KEY = "devdash_dolly_backend";
const EVENT = "devdash:dolly-backend";

export const DEFAULT_PREFS: DollyBackendPrefs = {
  backend: "auto",
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3.2",
};

function load(): DollyBackendPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<DollyBackendPrefs>;
    return {
      backend: parsed.backend ?? DEFAULT_PREFS.backend,
      ollamaEndpoint:
        parsed.ollamaEndpoint ?? DEFAULT_PREFS.ollamaEndpoint,
      ollamaModel: parsed.ollamaModel ?? DEFAULT_PREFS.ollamaModel,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function save(prefs: DollyBackendPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(EVENT));
}

export function getDollyBackendSync(): DollyBackendPrefs {
  return load();
}

export function useDollyBackend(): {
  prefs: DollyBackendPrefs;
  set: (next: Partial<DollyBackendPrefs>) => void;
  reset: () => void;
} {
  const [prefs, setPrefs] = useState<DollyBackendPrefs>(() =>
    typeof window !== "undefined" ? load() : DEFAULT_PREFS
  );

  useEffect(() => {
    const sync = () => setPrefs(load());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    prefs,
    set: (next) => {
      const updated = { ...load(), ...next };
      save(updated);
      setPrefs(updated);
    },
    reset: () => {
      save(DEFAULT_PREFS);
      setPrefs(DEFAULT_PREFS);
    },
  };
}

/** Headers to send to /api/dolly carrying the user's backend preference. */
export function dollyBackendHeaders(): Record<string, string> {
  const prefs = getDollyBackendSync();
  return {
    "x-dolly-backend": prefs.backend,
    "x-dolly-ollama-endpoint": prefs.ollamaEndpoint,
    "x-dolly-ollama-model": prefs.ollamaModel,
  };
}
