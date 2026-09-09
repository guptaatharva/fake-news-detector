"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Globe, Search, BrainCircuit, CheckCircle2, Sparkles } from "lucide-react";
import RedSweepBorder from "@/components/animation/RedSweepBorder";

export default function ReadyPanel() {
  const steps = [
    {
      icon: Search,
      title: "EXTRACT CLAIMS",
      description: "Isolates core factual assertions from submitted articles, URLs, or claims.",
      code: "STAGE_01",
    },
    {
      icon: Globe,
      title: "LIVE WEB SEARCH",
      description: "Retrieves fresh primary sources and independent news documents in real time.",
      code: "STAGE_02",
    },
    {
      icon: BrainCircuit,
      title: "AI REASONING",
      description: "Corroborates claims against retrieved content to evaluate accuracy and authority.",
      code: "STAGE_03",
    },
    {
      icon: CheckCircle2,
      title: "GENERATE VERDICT",
      description: "Calculates confidence percentage, evidence matrix, and explainable summary.",
      code: "STAGE_04",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
      className="surface-card p-8 space-y-8 shadow-2xl border border-graphite-border bg-graphite-surface relative overflow-hidden"
    >
      <RedSweepBorder />

      <div className="text-center space-y-4 max-w-xl mx-auto">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-graphite-elevated border border-graphite-border shadow-red-glow mx-auto">
          <ShieldCheck className="h-8 w-8 text-neonRed" />
        </div>

        <h2 className="font-display text-3xl font-bold text-foreground">
          INTELLIGENCE WORKSPACE READY
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Paste a news article, URL, or claim on the left to begin an autonomous AI verification. VeraCius will query the live web, evaluate sources, and deliver a transparent report.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 pt-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="p-5 rounded-2xl bg-graphite-bg border border-graphite-border space-y-3 hover:border-neonRed/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-graphite-elevated border border-graphite-border">
                  <Icon className="h-5 w-5 text-neonRed" />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  {step.code}
                </span>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  {step.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl bg-graphite-bg/60 border border-graphite-border text-center font-mono text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 text-neonRed animate-pulse" />
        <span>SYSTEM IDLE — AWAITING USER INPUT</span>
      </div>
    </motion.div>
  );
}