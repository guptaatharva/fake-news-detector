"use client";

import { motion } from "framer-motion";
import { Database, Zap, Cpu, CheckCircle2, Search, Layers } from "lucide-react";

const steps = [
  {
    id: "01",
    title: "SOURCE QUALITY",
    desc: "Assessing domain authority, historical reliability, and editorial standards.",
    icon: Database
  },
  {
    id: "02",
    title: "EVIDENCE RELEVANCE",
    desc: "Semantic matching between the isolated claim and extracted source text.",
    icon: Search
  },
  {
    id: "03",
    title: "CROSS-SOURCE CONSENSUS",
    desc: "Identifying corroboration or contradiction across independent reporting entities.",
    icon: Cpu
  },
  {
    id: "04",
    title: "RECENCY & CONTEXT",
    desc: "Evaluating the timeline of evidence against shifting real-world events.",
    icon: Zap
  },
  {
    id: "05",
    title: "SYNTHESIS & VERDICT",
    desc: "Synthesizing signals into an auditable confidence score and transparent verdict.",
    icon: CheckCircle2
  }
];

export default function TrustArchitecture() {
  return (
    <div id="architecture" className="mx-auto w-full max-w-6xl py-24 sm:py-32 px-6 relative z-20">
      {/* Section Header */}
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-card dark:bg-white/[0.04] border border-border/70 dark:border-white/10 shadow-[0_0_15px_rgba(255,23,68,0.1)]">
          <Layers className="h-3.5 w-3.5 text-neonRed" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            SYSTEM ARCHITECTURE
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-foreground">
          THE FIVE-STAGE <span className="text-neonRed drop-shadow-[0_0_20px_rgba(255,23,68,0.35)]">PIPELINE</span>
        </h2>
        <p className="text-muted-foreground font-sans text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Our autonomous intelligence pipeline enforces mathematical rigor, eliminating hallucinations through deterministic source grounding.
        </p>
      </div>

      <div className="relative">
        {/* Subtle connecting track line */}
        <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-border/80 dark:via-white/10 to-transparent -translate-y-1/2 hidden lg:block" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 25, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-6 sm:p-7 rounded-3xl bg-card/80 dark:bg-[#07070a]/80 backdrop-blur-xl border border-border/80 dark:border-white/10 hover:border-neonRed/50 hover:shadow-[0_0_30px_rgba(255,23,68,0.18)] transition-all duration-300 group flex flex-col items-center text-center z-10"
            >
              {/* Subtle top hover glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-neonRed/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="h-13 w-13 rounded-2xl bg-muted/50 dark:bg-white/[0.04] border border-border/80 dark:border-white/10 flex items-center justify-center mb-6 group-hover:border-neonRed/60 group-hover:shadow-[0_0_20px_rgba(255,23,68,0.25)] transition-all duration-300">
                <step.icon className="h-5 w-5 text-muted-foreground group-hover:text-neonRed transition-colors" />
              </div>
              
              <span className="font-mono text-[11px] text-neonRed font-bold tracking-widest uppercase mb-2">
                STAGE {step.id}
              </span>
              <h3 className="font-display text-sm font-bold text-foreground tracking-wide mb-3">
                {step.title}
              </h3>
              <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
