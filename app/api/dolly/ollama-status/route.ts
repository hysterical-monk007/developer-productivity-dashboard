import { NextResponse } from "next/server";
import { probeOllama, DEFAULT_OLLAMA_ENDPOINT } from "@/lib/dolly/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side probe of the user's local Ollama instance. We do this on the
 * server (not the browser) so the call goes from Node — which avoids CORS
 * preflight friction with localhost requests.
 *
 * Returns { ok, models, error } — the Settings page renders it directly.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint") ?? DEFAULT_OLLAMA_ENDPOINT;
  const probe = await probeOllama(endpoint);
  return NextResponse.json(probe, {
    headers: { "Cache-Control": "no-store" },
  });
}
