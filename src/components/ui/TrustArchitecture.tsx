"use client";

import { motion } from "framer-motion";
import { Database, Zap, Cpu, CheckCircle2, Search } from "lucide-react";

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
    desc: "Semantic matching between the isolated claim and the extracted source text.",
    icon: Search
  },
  {
    id: "03",
    title: "CROSS-SOURCE AGREEMENT",
    desc: "Identifying corroboration or contradiction across multiple independent entities.",
    icon: Cpu
  },
  {
    id: "04",
    title: "RECENCY & CONTEXT",
    desc: "Evaluating the timeline of the evidence against the claim's context.",
    icon: Zap
  },
  {
    id: "05",
    title: "FINAL ASSESSMENT",
    desc: "Synthesizing signals into a conclusive confidence metric and verdict.",
    icon: CheckCircle2
  }
];

export default function TrustArchitecture() {
  return (
    <div className="mx-auto w-full max-w-6xl py-24 px-6 relative z-20">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-display font-black tracking-wider text-foreground mb-4">
          TRUST <span className="text-neonRed">ARCHITECTURE</span>
        </h2>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl mx-auto">
          Our proprietary five-stage intelligence pipeline ensures rigorous, transparent verification for every claim.
        </p>
      </div>

      <div className="relative">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#35151B] to-transparent -translate-y-1/2 hidden lg:block" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative p-6 rounded-2xl bg-graphite-surface border border-graphite-border hover:border-neonRed/40 transition-colors group flex flex-col items-center text-center z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-neonRed/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="h-12 w-12 rounded-xl bg-graphite-bg border border-graphite-border-sec flex items-center justify-center mb-6 group-hover:border-neonRed group-hover:shadow-[0_0_15px_rgba(255,23,68,0.3)] transition-all">
                <step.icon className="h-5 w-5 text-muted-foreground group-hover:text-neonRed transition-colors" />
              </div>
              
              <span className="font-mono text-[10px] text-neonRed font-bold tracking-widest mb-2">
                STAGE {step.id}
              </span>
              <h3 className="font-display text-sm font-bold text-foreground tracking-wide mb-3">
                {step.title}
              </h3>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
