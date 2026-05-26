/**
 * Ollama client — runs entirely against a locally-installed Ollama instance
 * (https://ollama.com). Default endpoint http://localhost:11434.
 *
 * Two things this module does:
 *   - probeOllama(endpoint)  -> { ok, models, version } detection
 *   - streamOllama(...)      -> async iterable of token deltas
 *
 * No network leaves the user's machine when this path is active. Perfect
 * for offline use — Dolly works on a plane, on the train, anywhere.
 */

export const DEFAULT_OLLAMA_ENDPOINT = "http://localhost:11434";

export type OllamaProbe = {
  ok: boolean;
  models: { name: string; size?: number; modified?: string }[];
  error?: string;
};

type OllamaTag = {
  name: string;
  modified_at?: string;
  size?: number;
};

/**
 * Hit /api/tags on the local Ollama server. Returns the list of installed
 * models, or { ok: false } if the server isn't reachable.
 *
 * Short timeout — if Ollama isn't there, we want to know in <500ms so the
 * UI can fall back without waiting.
 */
export async function probeOllama(
  endpoint = DEFAULT_OLLAMA_ENDPOINT
): Promise<OllamaProbe> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${endpoint}/api/tags`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, models: [], error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { models?: OllamaTag[] };
    const models = (json.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
    }));
    return { ok: true, models };
  } catch (err) {
    return {
      ok: false,
      models: [],
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Stream a chat completion from Ollama. Yields raw text deltas as they
 * arrive. The Ollama HTTP API streams newline-delimited JSON objects.
 */
export async function* streamOllama({
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  model,
  messages,
  temperature = 0.4,
  signal,
}: {
  endpoint?: string;
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
  signal?: AbortSignal;
}): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature },
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status}: ${body.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep last partial line for next chunk

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        if (evt.message?.content) {
          yield evt.message.content;
        }
        if (evt.done) return;
      } catch {
        // ignore malformed lines — Ollama sometimes sends partial JSON
      }
    }
  }
}
