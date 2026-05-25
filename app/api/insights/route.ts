import { NextResponse } from "next/server";
import { generateInsights, type StatsPayload } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<StatsPayload> = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — we'll use defaults
  }

  const stats: StatsPayload = {
    commits30d: body.commits30d ?? 287,
    prsOpen: body.prsOpen ?? 47,
    prsMerged: body.prsMerged ?? 312,
    issuesOpen: body.issuesOpen ?? 23,
    streakDays: body.streakDays ?? 18,
    activeRepos: body.activeRepos ?? 12,
    topRepo: body.topRepo ?? "web-app",
    mostActiveDay: body.mostActiveDay ?? "Wednesday",
    languageBreakdown: body.languageBreakdown ?? [
      { name: "TypeScript", pct: 42 },
      { name: "Go", pct: 24 },
      { name: "Swift", pct: 12 },
      { name: "Python", pct: 11 },
    ],
  };

  const result = await generateInsights(stats);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
