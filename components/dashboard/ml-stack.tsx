"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Activity,
  TrendingUp,
  Network,
  Gauge,
  Layers,
  WifiOff,
} from "lucide-react";
import { getModelInfo } from "@/lib/ml/classifier";
import { mockForecastModel } from "@/mock/timeseries";

const classifierInfo = getModelInfo();

type ModuleSpec = {
  icon: typeof Brain;
  name: string;
  algorithm: string;
  details: { label: string; value: string }[];
};

function buildModules(): ModuleSpec[] {
  return [
    {
      icon: TrendingUp,
      name: "Forecasting",
      algorithm: "Holt-Winters double exponential smoothing",
      details: [
        { label: "α", value: mockForecastModel.alpha.toFixed(2) },
        { label: "β", value: mockForecastModel.beta.toFixed(2) },
        { label: "R²", value: mockForecastModel.rSquared.toFixed(2) },
        { label: "σ_residual", value: mockForecastModel.residualSigma.toFixed(2) },
      ],
    },
    {
      icon: Activity,
      name: "Anomaly detection",
      algorithm: "Modified z-score (MAD) + EWMA control chart",
      details: [
        { label: "z threshold", value: "3.5" },
        { label: "EWMA λ", value: "0.2" },
        { label: "robust to outliers", value: "yes" },
      ],
    },
    {
      icon: Brain,
      name: "Classification",
      algorithm: classifierInfo.algorithm,
      details: [
        {
          label: "classes",
          value: classifierInfo.classes.length.toString(),
        },
        { label: "vocab", value: classifierInfo.vocabSize.toString() },
        {
          label: "training",
          value: `${classifierInfo.trainingSize} docs`,
        },
        { label: "smoothing", value: classifierInfo.smoothing },
      ],
    },
    {
      icon: Network,
      name: "Trend testing",
      algorithm: "Mann-Kendall τ + 14d window",
      details: [
        { label: "test", value: "non-parametric" },
        { label: "threshold", value: "|τ| > 0.25" },
      ],
    },
    {
      icon: Gauge,
      name: "Productivity index",
      algorithm: "Weighted logistic aggregation",
      details: [
        { label: "features", value: "6" },
        { label: "range", value: "0–100" },
      ],
    },
    {
      icon: Layers,
      name: "Insights engine",
      algorithm: "Rules engine over ML signals",
      details: [
        { label: "detectors", value: "7" },
        { label: "deterministic", value: "yes" },
        { label: "network", value: "none required" },
      ],
    },
  ];
}

export function MLStack({ delay = 0 }: { delay?: number }) {
  const modules = buildModules();

  return (
    <motion.section
      id="ml-stack"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="glass rounded-2xl p-6 scroll-mt-20"
    >
      <header className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-emerald-300" />
            ML stack
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
              <WifiOff className="h-2.5 w-2.5" />
              offline-capable
            </span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every analytical signal on this dashboard comes from one of these
            algorithms running in your browser. Zero LLM dependency.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * i }}
              className="rounded-xl border border-foreground/[0.08] bg-background/30 p-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/15 ring-1 ring-emerald-400/30">
                  <Icon className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight">
                    {m.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {m.algorithm}
                  </p>
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                {m.details.map((d) => (
                  <li
                    key={d.label}
                    className="flex items-center justify-between gap-1 text-muted-foreground"
                  >
                    <span className="truncate">{d.label}</span>
                    <span className="font-mono text-foreground/80 tabular-nums">
                      {d.value}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 text-[10px] text-muted-foreground leading-relaxed">
        Algorithms are pure-TypeScript implementations bundled into the client.
        Deterministic on the same input. The Anthropic API is optional and
        used only to polish the prose of pre-computed insights — it cannot
        invent insights, change confidence scores, or fabricate numbers.
      </p>
    </motion.section>
  );
}
