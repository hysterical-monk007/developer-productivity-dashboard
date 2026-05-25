import Anthropic from "@anthropic-ai/sdk";
import {
  fallbackInsights,
  fallbackMetadata,
  pickInsights,
  type Insight,
  type InsightCategory,
  type ModelMetadata,
} from "@/mock/insights-fallback";

export type StatsPayload = {
  commits30d: number;
  prsOpen: number;
  prsMerged: number;
  issuesOpen: number;
  streakDays: number;
  activeRepos: number;
  topRepo: string;
  mostActiveDay: string;
  languageBreakdown: { name: string; pct: number }[];
};

const SYSTEM_PROMPT = `You are an analytics engine for a developer productivity dashboard.

Given a JSON snapshot of the user's GitHub-style stats, generate EXACTLY 4 short insights they will see on their dashboard.

Output STRICT JSON in this exact shape — no prose, no markdown, no code fence:
{
  "insights": [
    {
      "category": "productivity" | "trend" | "warning" | "suggestion",
      "title": string,
      "body": string,
      "confidence": number,
      "signals": string[]
    }
  ]
}

Rules:
- Return exactly 4 insights.
- Vary categories: include at least one of each — productivity, trend, warning, suggestion.
- "title": max 8 words, punchy, no period at the end.
- "body": 1-2 sentences, specific, reference real numbers from the input when possible. No hedging.
- "confidence": a calibrated number between 0.55 and 0.98. Be honest — speculative claims get low confidence; well-supported claims get high confidence.
- "signals": 2-4 short feature names you used to derive the insight (e.g. "weekday cadence", "PR size percentile", "review queue age", "language mix"). Lowercase, no punctuation.
- Avoid generic platitudes. Make it feel like a senior engineer wrote it.`;

function parseInsights(text: string): Insight[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const arr: unknown = parsed.insights;
  if (!Array.isArray(arr)) throw new Error("insights not an array");
  const validCats: InsightCategory[] = ["productivity", "trend", "warning", "suggestion"];
  const result: Insight[] = [];
  for (const item of arr) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Insight).title === "string" &&
      typeof (item as Insight).body === "string" &&
      validCats.includes((item as Insight).category)
    ) {
      const i = item as Partial<Insight> & Pick<Insight, "category" | "title" | "body">;
      const confidence =
        typeof i.confidence === "number" && i.confidence >= 0 && i.confidence <= 1
          ? Math.max(0.55, Math.min(0.98, i.confidence))
          : 0.8;
      const signals =
        Array.isArray(i.signals) && i.signals.every((s) => typeof s === "string")
          ? i.signals.slice(0, 4)
          : ["activity patterns"];
      result.push({
        category: i.category,
        title: i.title.slice(0, 80),
        body: i.body.slice(0, 280),
        confidence,
        signals,
      });
    }
  }
  if (result.length < 4) throw new Error("not enough valid insights");
  return result.slice(0, 4);
}

export async function generateInsights(stats: StatsPayload): Promise<{
  insights: Insight[];
  source: "ai" | "mock";
  metadata: ModelMetadata;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useMock =
    !apiKey || apiKey === "" || apiKey === "sk-ant-your-key-here";

  if (useMock) {
    return {
      insights: pickInsights(),
      source: "mock",
      metadata: fallbackMetadata,
    };
  }

  const t0 = Date.now();
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Stats snapshot:\n\n${JSON.stringify(stats, null, 2)}\n\nReturn the JSON now.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("no text block in response");
    }
    const insights = parseInsights(textBlock.text);
    const computeMs = Date.now() - t0;
    return {
      insights,
      source: "ai",
      metadata: {
        ...fallbackMetadata,
        computeMs,
        model: `${response.model} · ${response.usage.input_tokens}→${response.usage.output_tokens} tok`,
      },
    };
  } catch (err) {
    console.warn(
      "[ai] Claude call failed, falling back to mock insights:",
      err instanceof Error ? err.message : err
    );
    return {
      insights: fallbackInsights,
      source: "mock",
      metadata: fallbackMetadata,
    };
  }
}
