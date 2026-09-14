"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Search, Globe, Cpu, Sparkles, CheckCircle2, FileText, Activity } from "lucide-react";
import RedSweepBorder from "@/components/animation/RedSweepBorder";

export default function LiveVerificationVisual() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: "input",
      tag: "CLAIM DETECTED",
      icon: Search,
      color: "text-neonRed",
      borderColor: "border-neonRed/40",
      content: {
        type: "STATEMENT",
        claim: "Global offshore wind capacity grew by 38% in 2025 according to new international energy reports.",
        source: "Input Stream: Web Article URL / Text Ingestion",
      },
    },
    {
      id: "extract",
      tag: "CLAIMS EXTRACTED",
      icon: FileText,
      color: "text-neonRed",
      borderColor: "border-neonRed/50",
      content: {
        extracted: [
          { text: "Offshore wind capacity grew by 38%", confidence: 98 },
          { text: "Growth occurred in the year 2025", confidence: 95 }
        ]
      },
    },
    {
      id: "search",
      tag: "SOURCES FOUND",
      icon: Globe,
      color: "text-neonRed",
      borderColor: "border-neonRed/50",
      content: {
        sources: [
          { name: "reuters.com", status: "Scraping full article content...", time: "120ms" },
          { name: "iea.org/reports", status: "Extracting official statistics...", time: "210ms" },
          { name: "bloomberg.com", status: "Cross-referencing claims...", time: "180ms" },
        ],
      },
    },
    {
      id: "cross_ref",
      tag: "CROSS-REFERENCED",
      icon: Activity,
      color: "text-neonRed",
      borderColor: "border-neonRed/40",
      content: {
        matches: [
          { title: "IEA Global Energy Outlook 2026", snippet: "...offshore wind additions surged significantly by 37.8% year-over-year...", authority: "HIGH" },
          { title: "Reuters Energy Desk", snippet: "Cross-border grid connections expanded wind power throughput globally...", authority: "HIGH" },
        ],
      },
    },
    {
      id: "evaluate",
      tag: "EVIDENCE EVALUATED",
      icon: Cpu,
      color: "text-neonRed",
      borderColor: "border-neonRed/50",
      content: {
        metrics: [
          { label: "SOURCE AUTHORITY", value: 92 },
          { label: "RECENCY", value: 98 },
          { label: "CORROBORATION", value: 89 },
        ]
      }
    },
    {
      id: "verdict",
      tag: "VERDICT",
      icon: ShieldCheck,
      color: "text-verificator-verified",
      borderColor: "border-verificator-verified/50",
      content: {
        verdict: "VERIFIED",
        confidence: 96,
        summary: "Claims directly match official IEA and Reuters datasets across 4 independent primary sources.",
      },
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3600);
    return () => clearInterval(timer);
  }, [steps.length]);

  const current = steps[activeStep];

  return (
    <div className="relative mx-auto w-full max-w-5xl pt-4">
      {/* Subtle atmospheric red glow behind visual console */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-neonRed/20 via-neonRed-deep/15 to-neonRed/20 blur-2xl opacity-50 dark:opacity-70 pointer-events-none" />

      {/* Main Console Deck (Orchid Hardware Polish) */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#08080c]/90 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
        <RedSweepBorder />

        {/* Command Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 dark:border-white/10 px-6 py-4 bg-muted/40 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-border dark:bg-white/20" />
              <div className="h-3 w-3 rounded-full bg-border dark:bg-white/20" />
              <div className="h-3 w-3 rounded-full bg-border dark:bg-white/20" />
            </div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-2 pl-2">
              <Sparkles className="h-3.5 w-3.5 text-neonRed animate-pulse" />
              <span>LIVE VERIFICATION ENGINE</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-neonRed bg-neonRed/10 px-3 py-1 rounded-full border border-neonRed/30 font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-neonRed animate-ping" />
              AGENT #9042 ACTIVE
            </span>
          </div>
        </div>

        {/* Pipeline Nodes Bar with Animated Motion Pulse Line */}
        <div className="relative border-b border-border/60 dark:border-white/10 bg-background/60 dark:bg-black/40 p-3 overflow-x-auto no-scrollbar">
          {/* Animated path line track */}
          <div className="absolute top-1/2 left-6 right-6 h-[1.5px] bg-border/80 dark:bg-white/10 -translate-y-1/2 hidden md:block" />
          <motion.div
            animate={{
              left: `${(activeStep / (steps.length - 1)) * 80 + 8}%`,
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/2 h-[2px] w-24 bg-gradient-to-r from-neonRed via-neonRed-bright to-transparent -translate-y-1/2 hidden md:block pointer-events-none shadow-[0_0_10px_rgba(255,23,68,0.8)]"
          />

          <div className="flex justify-between min-w-[680px] relative z-10 px-2 gap-2">
            {steps.map((step, idx) => {
              const isActive = idx === activeStep;
              const isPassed = idx < activeStep;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`flex-1 flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all text-center relative ${
                    isActive
                      ? "bg-card dark:bg-white/[0.08] border-neonRed/60 shadow-[0_0_20px_rgba(255,23,68,0.2)]"
                      : isPassed
                      ? "bg-muted/30 dark:bg-white/[0.02] border-border/50 text-muted-foreground"
                      : "bg-transparent border-transparent text-muted-foreground/60 hover:text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-neonRed to-[#D50032] text-white shadow-red-glow scale-105"
                        : isPassed
                        ? "bg-card dark:bg-white/[0.05] text-neonRed border border-border dark:border-white/10"
                        : "bg-muted dark:bg-white/[0.03] text-muted-foreground"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="h-4 w-4 text-neonRed" /> : `0${idx + 1}`}
                  </div>

                  <p
                    className={`font-mono text-[9px] uppercase tracking-wider hidden sm:block ${
                      isActive ? "text-foreground font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {step.tag}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content Window with Stagger Transition */}
        <div className="p-6 sm:p-8 min-h-[290px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Step Tag */}
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-bold tracking-widest px-3.5 py-1.5 rounded-full border bg-card dark:bg-white/[0.04] flex items-center gap-2 ${current.color} ${current.borderColor}`}
                >
                  <current.icon className="h-3.5 w-3.5 animate-pulse" />
                  {current.tag}
                </span>
                <span className="font-mono text-xs text-muted-foreground tracking-wider">
                  STATUS: {activeStep === steps.length - 1 ? 'ANALYSIS COMPLETE' : 'SYNTHESIZING SIGNALS'}
                </span>
              </div>

              {/* Dynamic Step Render */}
              {current.id === "input" && (
                <div className="p-5 sm:p-6 rounded-2xl bg-muted/40 dark:bg-black/40 border border-border dark:border-white/10 space-y-2">
                  <p className="font-mono text-xs text-neonRed uppercase tracking-wider font-semibold">INPUT CLAIM</p>
                  <p className="text-lg sm:text-xl font-display text-foreground leading-relaxed">
                    "{current.content.claim}"
                  </p>
                  <p className="text-xs font-mono text-muted-foreground pt-1">
                    {current.content.source}
                  </p>
                </div>
              )}

              {current.id === "extract" && (
                <div className="space-y-3">
                  {current.content.extracted?.map((ext, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 dark:bg-black/40 border border-border dark:border-white/10 font-mono text-sm"
                    >
                      <span className="text-foreground font-medium">"{ext.text}"</span>
                      <span className="text-neonRed text-xs font-semibold px-2 py-0.5 rounded bg-neonRed/10 border border-neonRed/20">CONFIDENCE: {ext.confidence}%</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {current.id === "search" && (
                <div className="space-y-3">
                  {current.content.sources?.map((src, i) => (
                    <motion.div
                      key={src.name}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/40 dark:bg-black/40 border border-border dark:border-white/10 font-mono text-xs hover:border-neonRed/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-neonRed shrink-0" />
                        <span className="text-foreground font-semibold">{src.name}</span>
                        <span className="text-muted-foreground hidden sm:inline">— {src.status}</span>
                      </div>
                      <span className="text-neonRed bg-neonRed/10 px-2.5 py-0.5 rounded border border-neonRed/20 font-semibold">
                        {src.time}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {current.id === "cross_ref" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {current.content.matches?.map((match, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="p-4 rounded-2xl bg-muted/40 dark:bg-black/40 border border-border dark:border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-bold text-foreground truncate">
                          {match.title}
                        </span>
                        <span className="font-mono text-[10px] text-verificator-verified bg-verificator-verified/10 px-2 py-0.5 rounded border border-verificator-verified/20 font-bold">
                          {match.authority} AUTH
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic line-clamp-2 leading-relaxed">
                        "{match.snippet}"
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {current.id === "evaluate" && (
                <div className="flex flex-col gap-4 p-5 rounded-2xl bg-muted/40 dark:bg-black/40 border border-border dark:border-white/10">
                  {current.content.metrics?.map((metric, i) => (
                    <div key={metric.label} className="space-y-1.5">
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground tracking-wider font-semibold">
                        <span>{metric.label}</span>
                        <span className="text-neonRed">{metric.value}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-card dark:bg-white/[0.08] rounded-full overflow-hidden border border-border/40">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          transition={{ delay: i * 0.2, duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-neonRed to-neonRed-bright shadow-red-glow rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {current.id === "verdict" && (
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="p-6 rounded-2xl bg-verificator-verified/10 border border-verificator-verified/30 flex flex-col sm:flex-row items-center justify-between gap-6"
                >
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <ShieldCheck className="h-6 w-6 text-verificator-verified" />
                      <span className="font-display text-2xl font-black tracking-wider text-verificator-verified">
                        {current.content.verdict}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                      {current.content.summary}
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-card dark:bg-black/60 border border-verificator-verified/40 min-w-[130px] shadow-[0_0_20px_rgba(52,211,153,0.15)]">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                      CONFIDENCE
                    </span>
                    <span className="font-mono text-3xl font-black text-verificator-verified">
                      {current.content.confidence}%
                    </span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
