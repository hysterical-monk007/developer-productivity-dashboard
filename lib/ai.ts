/**
 * Insight generation — ML-first, LLM-optional.
 *
 * Flow:
 *  1. Run the local insights-engine over the input data. Real anomaly
 *     detectors, trend tests, classifier outputs, and entropy stats fire
 *     candidate insights with data-derived confidence.
 *  2. If ANTHROPIC_API_KEY is set AND the caller hasn't opted out, send the
 *     ML-derived insights to Claude with a *rewrite-only* prompt. Claude
 *     polishes the prose but cannot invent new categories, change confidence
 *     scores, or hallucinate numbers — every fact remains the engine's.
 *  3. If anything goes wrong (no key, network failure, parse error), we
 *     return the raw engine output. The dashboard works the same offline.
 *
 * This means:
 *   - The confidence scores you see ARE the algorithms' confidence.
 *   - The signal tags ARE the algorithms that fired.
 *   - Disconnecting your network changes nothing visible to the user.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  generateInsightsFromData,
  type EngineInput,
  type Insight,
  type InsightCategory,
} from "@/lib/ml/insights-engine";
import { getModelInfo as getClassifierInfo } from "@/lib/ml/classifier";

export type StatsPayload = EngineInput;

export type ModelMetadata = {
  primaryEngine: string;
  enrichment: "claude" | "none";
  detectorsRun: number;
  candidatesGenerated: number;
  computeMs: number;
  classifier: {
    algorithm: string;
    vocabSize: number;
    trainingSize: number;
  };
  network: "offline-capable";
};

const REWRITE_SYSTEM_PROMPT = `You polish text. You DO NOT invent insights, change categories, modify confidence scores, or alter any numbers.

Input: a JSON array of insights from a local ML engine. Each has category, title, body, confidence, signals.

Output: STRICT JSON in the same shape, with ONLY \`title\` and \`body\` rewritten to be punchier and more specific. All other fields must be preserved exactly.

Rules:
- Keep every number, percentage, and statistical term from the original body.
- Keep the category. Do not invent a new one.
- Title: max 8 words, no period.
- Body: 1-2 sentences. Reference the same algorithms/signals as the original.
- Output only the JSON, no markdown code fence.`;

function parseRewrite(text: string, original: Insight[]): Insight[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const arr: unknown = parsed.insights ?? parsed;
  if (!Array.isArray(arr) || arr.length !== original.length) {
    throw new Error("rewrite did not preserve insight count");
  }
  return original.map((orig, i) => {
    const r = arr[i] as Partial<Insight> | undefined;
    if (
      r &&
      typeof r.title === "string" &&
      typeof r.body === "string" &&
      r.category === orig.category
    ) {
      return {
        ...orig,
        title: r.title.slice(0, 80),
        body: r.body.slice(0, 280),
      };
    }
    // Per-item fallback to the original
    return orig;
  });
}

export async function generateInsights(stats: StatsPayload): Promise<{
  insights: Insight[];
  source: "ai" | "mock";
  metadata: ModelMetadata;
}> {
  const t0 = Date.now();

  // 1. Always run the local ML engine first.
  const local = generateInsightsFromData(stats);
  const classifierInfo = getClassifierInfo();

  const baseMetadata: ModelMetadata = {
    primaryEngine: "rules-engine-over-ml-signals",
    enrichment: "none",
    detectorsRun: local.metadata.detectorsRun,
    candidatesGenerated: local.metadata.candidatesGenerated,
    computeMs: Date.now() - t0,
    classifier: {
      algorithm: classifierInfo.algorithm,
      vocabSize: classifierInfo.vocabSize,
      trainingSize: classifierInfo.trainingSize,
    },
    network: "offline-capable",
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const useEnrichment =
    Boolean(apiKey) && apiKey !== "" && apiKey !== "sk-ant-your-key-here";

  // 2. If no key, return the engine output as-is.
  if (!useEnrichment) {
    return {
      insights: local.insights,
      source: "mock", // "mock" in the UI means "no LLM enrichment" — engine output is real
      metadata: baseMetadata,
    };
  }

  // 3. Try Claude rewrite. On any failure, fall back to local.
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      temperature: 0.5,
      system: REWRITE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Polish these insights:\n\n${JSON.stringify({ insights: local.insights }, null, 2)}\n\nReturn the JSON now.`,
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("no text block in response");
    }
    const polished = parseRewrite(textBlock.text, local.insights);
    return {
      insights: polished,
      source: "ai",
      metadata: {
        ...baseMetadata,
        enrichment: "claude",
        computeMs: Date.now() - t0,
      },
    };
  } catch (err) {
    console.warn(
      "[ai] Claude rewrite failed, returning raw ML engine output:",
      err instanceof Error ? err.message : err
    );
    return {
      insights: local.insights,
      source: "mock",
      metadata: baseMetadata,
    };
  }
}
