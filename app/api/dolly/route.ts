import Anthropic from "@anthropic-ai/sdk";
import { DOLLY_SYSTEM, buildUserMessage } from "@/lib/dolly/prompt";
import { generateLocalResponse } from "@/lib/dolly/local-responder";
import { streamOllama, probeOllama, DEFAULT_OLLAMA_ENDPOINT } from "@/lib/dolly/ollama";
import type { DollyContext } from "@/lib/dolly/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Backend = "auto" | "claude" | "ollama" | "local";

type Body = {
  question: string;
  context: DollyContext;
  history?: { role: "user" | "assistant"; text: string }[];
};

type SourceTag = "ai" | "ollama" | "local";

function hasClaudeKey(): boolean {
  const k = process.env.ANTHROPIC_API_KEY;
  return Boolean(k) && k !== "" && k !== "sk-ant-your-key-here";
}

/**
 * Streaming SSE endpoint. Dispatches to one of three backends:
 *   - Claude  (cloud, needs ANTHROPIC_API_KEY)
 *   - Ollama  (local, needs Ollama running at the configured endpoint)
 *   - Local   (deterministic rule-based responder, always works)
 *
 * "auto" picks: Ollama if running > Claude if key present > Local fallback.
 *
 * Whichever backend succeeds, the response stream emits "delta" events for
 * each text chunk and a final "done" event tagging which backend served it.
 * The client UI reads that tag and shows the appropriate badge.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  if (!body.question || !body.context) {
    return new Response("missing question or context", { status: 400 });
  }

  const requested = (req.headers.get("x-dolly-backend") ?? "auto") as Backend;
  const ollamaEndpoint =
    req.headers.get("x-dolly-ollama-endpoint") ?? DEFAULT_OLLAMA_ENDPOINT;
  const ollamaModel = req.headers.get("x-dolly-ollama-model") ?? "llama3.2";

  // Resolve "auto" → concrete backend by probing what's available.
  let backend: Backend = requested;
  if (backend === "auto") {
    const probe = await probeOllama(ollamaEndpoint);
    if (probe.ok && probe.models.length > 0) {
      backend = "ollama";
    } else if (hasClaudeKey()) {
      backend = "claude";
    } else {
      backend = "local";
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`)
        );
      };
      const done = (source: SourceTag, info?: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, source, ...info })}\n\n`
          )
        );
        controller.close();
      };
      const streamLocal = async () => {
        const text = generateLocalResponse(body.question, body.context);
        for (const tok of text.split(/(\s+)/)) {
          send(tok);
          await new Promise((r) => setTimeout(r, 18));
        }
      };

      // OLLAMA
      if (backend === "ollama") {
        try {
          const contextJson = JSON.stringify(body.context, null, 2);
          const messages = [
            { role: "system" as const, content: DOLLY_SYSTEM },
            ...(body.history?.slice(-6) ?? []).map((m) => ({
              role: m.role,
              content: m.text,
            })),
            {
              role: "user" as const,
              content: buildUserMessage(body.question, contextJson),
            },
          ];
          for await (const tok of streamOllama({
            endpoint: ollamaEndpoint,
            model: ollamaModel,
            messages,
            temperature: 0.4,
          })) {
            send(tok);
          }
          done("ollama", { model: ollamaModel });
          return;
        } catch (err) {
          console.warn(
            "[dolly] Ollama stream failed, falling back to local:",
            err instanceof Error ? err.message : err
          );
          await streamLocal();
          done("local", { fallbackFrom: "ollama" });
          return;
        }
      }

      // CLAUDE
      if (backend === "claude") {
        if (!hasClaudeKey()) {
          await streamLocal();
          done("local", { fallbackFrom: "claude" });
          return;
        }
        try {
          const client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY!,
          });
          const contextJson = JSON.stringify(body.context, null, 2);
          const messages = [
            ...(body.history?.slice(-6) ?? []).map((m) => ({
              role: m.role,
              content: m.text,
            })),
            {
              role: "user" as const,
              content: buildUserMessage(body.question, contextJson),
            },
          ];
          const response = await client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 700,
            temperature: 0.4,
            system: DOLLY_SYSTEM,
            messages,
          });
          for await (const event of response) {
            if (event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta.type === "text_delta") send(delta.text);
            }
          }
          done("ai", { model: "claude-sonnet-4-6" });
          return;
        } catch (err) {
          console.warn(
            "[dolly] Claude stream failed, falling back to local:",
            err instanceof Error ? err.message : err
          );
          await streamLocal();
          done("local", { fallbackFrom: "claude" });
          return;
        }
      }

      // LOCAL
      await streamLocal();
      done("local");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
    },
  });
}
