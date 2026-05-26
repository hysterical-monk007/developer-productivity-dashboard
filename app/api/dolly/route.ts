import Anthropic from "@anthropic-ai/sdk";
import { DOLLY_SYSTEM, buildUserMessage } from "@/lib/dolly/prompt";
import { generateLocalResponse } from "@/lib/dolly/local-responder";
import type { DollyContext } from "@/lib/dolly/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  question: string;
  context: DollyContext;
  history?: { role: "user" | "assistant"; text: string }[];
};

/**
 * Server-Sent Events streaming endpoint.
 *
 * Each line of the response is a `data: <token>\n\n` chunk that the client
 * reads with the Streams API. We use a custom event marker `__DONE__` on the
 * final chunk so the client knows when the stream is complete.
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useLLM =
    Boolean(apiKey) && apiKey !== "" && apiKey !== "sk-ant-your-key-here";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
      };
      const done = (meta: { source: "ai" | "local" }) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`)
        );
        controller.close();
      };

      if (!useLLM) {
        // Local responder — stream it word-by-word for the same feel
        const text = generateLocalResponse(body.question, body.context);
        const tokens = text.split(/(\s+)/);
        for (const tok of tokens) {
          send(tok);
          // Brief delay so the UI gets a real streaming feel
          await new Promise((r) => setTimeout(r, 18));
        }
        done({ source: "local" });
        return;
      }

      try {
        const client = new Anthropic({ apiKey });
        const contextJson = JSON.stringify(body.context, null, 2);
        const userMsg = buildUserMessage(body.question, contextJson);

        // Reconstruct a short conversation history if provided
        const messages = [
          ...(body.history?.slice(-6) ?? []).map((m) => ({
            role: m.role,
            content: m.text,
          })),
          { role: "user" as const, content: userMsg },
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
            if (delta.type === "text_delta") {
              send(delta.text);
            }
          }
        }
        done({ source: "ai" });
      } catch (err) {
        console.warn(
          "[dolly] Claude stream failed, falling back to local responder:",
          err instanceof Error ? err.message : err
        );
        // Stream local fallback into the same stream so the client doesn't
        // have to handle a switch mid-response.
        const text = generateLocalResponse(body.question, body.context);
        const tokens = text.split(/(\s+)/);
        for (const tok of tokens) {
          send(tok);
          await new Promise((r) => setTimeout(r, 18));
        }
        done({ source: "local" });
      }
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
