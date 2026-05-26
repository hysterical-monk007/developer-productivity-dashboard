/**
 * Project Profile — automated classification of a user's overall work focus.
 *
 * Takes the list of repos (name, language, description), classifies each one
 * into a domain (web, mobile, infra, data, AI/ML, dev tools, games, etc.)
 * based on language + name + description keyword scoring, then aggregates.
 *
 * Output: top-N domains with confidence, primary languages, total project
 * count, and a generated paragraph summary describing the user's focus.
 *
 * Pure client-side — same trick as the Naive Bayes classifier. No network.
 */

export type Domain =
  | "web-frontend"
  | "web-backend"
  | "mobile"
  | "infra"
  | "ai-ml"
  | "data"
  | "dev-tools"
  | "systems"
  | "games"
  | "creative"
  | "other";

export const DOMAIN_LABEL: Record<Domain, string> = {
  "web-frontend": "Web frontend",
  "web-backend": "Backend / APIs",
  mobile: "Mobile apps",
  infra: "Infrastructure / DevOps",
  "ai-ml": "AI & machine learning",
  data: "Data & analytics",
  "dev-tools": "Developer tools",
  systems: "Systems & low-level",
  games: "Games & graphics",
  creative: "Creative / design",
  other: "Other",
};

export const DOMAIN_EMOJI: Record<Domain, string> = {
  "web-frontend": "🌐",
  "web-backend": "⚙️",
  mobile: "📱",
  infra: "☁️",
  "ai-ml": "🧠",
  data: "📊",
  "dev-tools": "🔧",
  systems: "🖥️",
  games: "🎮",
  creative: "🎨",
  other: "•",
};

type DomainRule = {
  langs: string[]; // primary languages that suggest this domain
  langWeight: number;
  keywords: string[]; // name/description keywords
  keywordWeight: number;
};

const RULES: Partial<Record<Domain, DomainRule>> = {
  "web-frontend": {
    langs: ["TypeScript", "JavaScript", "Vue", "Svelte", "HTML", "CSS"],
    langWeight: 0.6,
    keywords: [
      "web", "app", "frontend", "ui", "dashboard", "site", "next",
      "react", "vue", "svelte", "angular", "component", "design-system",
    ],
    keywordWeight: 0.4,
  },
  "web-backend": {
    langs: ["Go", "Rust", "Python", "Ruby", "Java", "Kotlin", "PHP", "C#", "Elixir"],
    langWeight: 0.5,
    keywords: [
      "api", "server", "backend", "service", "gateway", "auth",
      "payments", "billing", "graphql", "rest", "microservice", "queue",
    ],
    keywordWeight: 0.5,
  },
  mobile: {
    langs: ["Swift", "Kotlin", "Dart", "Objective-C", "Java"],
    langWeight: 0.7,
    keywords: ["ios", "android", "mobile", "flutter", "react-native", "expo"],
    keywordWeight: 0.5,
  },
  infra: {
    langs: ["HCL", "Shell", "Dockerfile"],
    langWeight: 0.8,
    keywords: [
      "terraform", "ansible", "k8s", "kubernetes", "infra", "deploy",
      "ci", "ops", "cluster", "aws", "gcp", "azure", "docker",
      "platform", "pipeline",
    ],
    keywordWeight: 0.5,
  },
  "ai-ml": {
    langs: ["Python", "Jupyter Notebook"],
    langWeight: 0.4,
    keywords: [
      "ml", "ai", "neural", "model", "train", "llm", "rag", "agent",
      "embedding", "vector", "openai", "anthropic", "transformer",
      "torch", "tensorflow", "huggingface",
    ],
    keywordWeight: 0.7,
  },
  data: {
    langs: ["Python", "R", "SQL"],
    langWeight: 0.4,
    keywords: [
      "data", "etl", "warehouse", "analytics", "pipeline", "dbt",
      "airflow", "ingest", "metrics", "bi", "report",
    ],
    keywordWeight: 0.7,
  },
  "dev-tools": {
    langs: ["TypeScript", "Rust", "Go"],
    langWeight: 0.2,
    keywords: [
      "cli", "lint", "tool", "compiler", "parser", "build", "bundler",
      "framework", "sdk", "library", "plugin", "vscode", "extension",
      "formatter", "language-server", "lsp",
    ],
    keywordWeight: 0.7,
  },
  systems: {
    langs: ["C", "C++", "Rust", "Zig", "Assembly"],
    langWeight: 0.7,
    keywords: ["kernel", "os", "driver", "embedded", "firmware", "rtos"],
    keywordWeight: 0.5,
  },
  games: {
    langs: ["C#", "C++", "GDScript"],
    langWeight: 0.4,
    keywords: ["game", "engine", "unity", "unreal", "godot", "shader"],
    keywordWeight: 0.7,
  },
  creative: {
    langs: ["GLSL", "Shaderlab"],
    langWeight: 0.6,
    keywords: ["art", "animation", "creative", "generative", "music", "audio"],
    keywordWeight: 0.6,
  },
};

export type RepoInput = {
  name: string;
  language?: string | null;
  description?: string | null;
};

export type RepoClassification = {
  name: string;
  primaryDomain: Domain;
  scores: Partial<Record<Domain, number>>;
  confidence: number;
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export function classifyRepo(repo: RepoInput): RepoClassification {
  const text = `${repo.name} ${repo.description ?? ""}`.toLowerCase();
  const tokens = new Set(tokenize(text));
  const lang = repo.language ?? "";

  const scores: Partial<Record<Domain, number>> = {};
  for (const [domain, rule] of Object.entries(RULES) as [Domain, DomainRule][]) {
    let score = 0;
    if (lang && rule.langs.includes(lang)) {
      score += rule.langWeight;
    }
    let kwHits = 0;
    for (const kw of rule.keywords) {
      // Direct token match
      if (tokens.has(kw)) kwHits++;
      // Substring match for hyphenated names
      else if (text.includes(kw)) kwHits += 0.5;
    }
    if (kwHits > 0) {
      score += Math.min(rule.keywordWeight, rule.keywordWeight * (kwHits / 3));
    }
    if (score > 0) scores[domain] = score;
  }

  const ranked = (Object.entries(scores) as [Domain, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  if (ranked.length === 0) {
    return {
      name: repo.name,
      primaryDomain: "other",
      scores: { other: 0.4 },
      confidence: 0.4,
    };
  }
  const [topDomain, topScore] = ranked[0];
  const total = ranked.reduce((s, [, v]) => s + v, 0);
  const confidence = Math.min(0.98, Math.max(0.5, topScore / Math.max(1, total)));
  return { name: repo.name, primaryDomain: topDomain, scores, confidence };
}

export type ProfileResult = {
  domains: { domain: Domain; count: number; share: number; repos: string[] }[];
  primaryDomain: Domain;
  languageBreakdown: { language: string; count: number; share: number }[];
  summary: string;
  totalRepos: number;
};

export function buildProjectProfile(repos: RepoInput[]): ProfileResult {
  if (repos.length === 0) {
    return {
      domains: [],
      primaryDomain: "other",
      languageBreakdown: [],
      summary:
        "I don't see any repos to analyze yet. Link GitHub or add some repos to your account, and I'll classify them.",
      totalRepos: 0,
    };
  }

  // Classify
  const classifications = repos.map(classifyRepo);

  // Aggregate by domain
  const domainMap = new Map<Domain, { count: number; repos: string[] }>();
  for (const c of classifications) {
    const entry = domainMap.get(c.primaryDomain) ?? { count: 0, repos: [] };
    entry.count++;
    entry.repos.push(c.name);
    domainMap.set(c.primaryDomain, entry);
  }
  const total = classifications.length;
  const domains = Array.from(domainMap.entries())
    .map(([domain, { count, repos: rs }]) => ({
      domain,
      count,
      share: count / total,
      repos: rs,
    }))
    .sort((a, b) => b.count - a.count);

  // Language breakdown
  const langMap = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    langMap.set(r.language, (langMap.get(r.language) ?? 0) + 1);
  }
  const langTotal = Array.from(langMap.values()).reduce((a, b) => a + b, 0);
  const languageBreakdown = Array.from(langMap.entries())
    .map(([language, count]) => ({
      language,
      count,
      share: langTotal > 0 ? count / langTotal : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const primaryDomain = domains[0]?.domain ?? "other";

  // Generate paragraph summary
  const summary = composeSummary(domains, languageBreakdown, total);

  return {
    domains,
    primaryDomain,
    languageBreakdown,
    summary,
    totalRepos: total,
  };
}

function composeSummary(
  domains: { domain: Domain; count: number; share: number; repos: string[] }[],
  langs: { language: string; share: number }[],
  total: number
): string {
  if (total === 0) return "";
  const top = domains[0];
  const second = domains[1];
  const topLang = langs[0]?.language;
  const secondLang = langs[1]?.language;

  const topShare = (top.share * 100).toFixed(0);
  const topLabel = DOMAIN_LABEL[top.domain].toLowerCase();
  const topRepoNames = top.repos.slice(0, 3).map((r) => `\`${r}\``).join(", ");

  const parts: string[] = [];

  parts.push(
    `Your work centers on **${topLabel}** — ${top.count} of ${total} repos (${topShare}%)${
      topRepoNames ? `, including ${topRepoNames}` : ""
    }.`
  );

  if (second && second.share >= 0.15) {
    const secLabel = DOMAIN_LABEL[second.domain].toLowerCase();
    parts.push(
      `You also spend meaningful time on **${secLabel}** (${second.count} repo${second.count === 1 ? "" : "s"}).`
    );
  }

  if (topLang) {
    if (secondLang && secondLang !== topLang) {
      parts.push(
        `Primary language is **${topLang}**, with **${secondLang}** as a secondary tool.`
      );
    } else {
      parts.push(`Primary language is **${topLang}**.`);
    }
  }

  // Closing observation
  if (domains.length >= 4) {
    parts.push(
      `You're a generalist — ${domains.length} distinct domains across ${total} projects.`
    );
  } else if (domains.length === 1) {
    parts.push("Highly focused — almost everything you build sits in one domain.");
  }

  return parts.join(" ");
}
