import { NextResponse } from "next/server";
import { generateInsights } from "@/lib/ai";
import type { EngineInput } from "@/lib/ml/insights-engine";
import { commitsLast30Days } from "@/mock/timeseries";
import { activity, classifyEvent, type WorkKind } from "@/mock/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Build the EngineInput from the request body, falling back to mock data for
 * any field the caller didn't supply. The engine runs deterministically over
 * whatever data shape it receives — same input, same output.
 */
function buildEngineInput(body: Partial<EngineInput>): EngineInput {
  // Default commit history from the deterministic mock (30 historical points,
  // ignoring forecast rows).
  const defaultCommits = commitsLast30Days
    .filter((p) => !p.isForecast && p.commits !== null)
    .map((p) => ({ iso: p.iso, count: p.commits as number }));

  // Default work-kind counts come from running the Naive Bayes classifier
  // over the mock activity feed. This gives the engine real classifier output
  // even in demo mode.
  const defaultWorkKindCounts: Record<WorkKind, number> = {
    feature: 0,
    bugfix: 0,
    refactor: 0,
    chore: 0,
    docs: 0,
    perf: 0,
    review: 0,
  };
  for (const ev of activity) {
    const cls = classifyEvent(ev);
    defaultWorkKindCounts[cls.workKind]++;
  }

  // Inject a small synthetic uptick on the last day of the mock commit
  // series so the anomaly detector has something honest to find in demo
  // mode. Real connected accounts naturally produce their own variance.
  const commits =
    body.commits ??
    defaultCommits.map((c, i, arr) =>
      i === arr.length - 1 ? { ...c, count: Math.round(c.count * 1.9) } : c
    );

  return {
    commits,
    workKindCounts: body.workKindCounts ?? defaultWorkKindCounts,
    prsOpen: body.prsOpen ?? 18,
    prsMerged: body.prsMerged ?? 312,
    // Issues > 2*PRs + 8 triggers the backlog warning detector
    issuesOpen: body.issuesOpen ?? 52,
    streakDays: body.streakDays ?? 18,
    topRepo: body.topRepo ?? { name: "web-app", share: 0.42 },
    mostActiveDay: body.mostActiveDay ?? "Wednesday",
  };
}

export async function POST(req: Request) {
  let body: Partial<EngineInput> = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — we use defaults
  }

  const engineInput = buildEngineInput(body);
  const result = await generateInsights(engineInput);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
