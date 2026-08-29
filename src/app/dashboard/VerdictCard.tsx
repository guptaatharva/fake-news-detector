"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Cpu, Sparkles } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AnimatedNumber from "@/components/animation/AnimatedNumber";
import RedSweepBorder from "@/components/animation/RedSweepBorder";

interface VerdictCardProps {
  result: any;
}

export default function VerdictCard({ result }: VerdictCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const verdict = result.verdict || "UNVERIFIABLE";
  const confidence = result.confidenceScore || 0;

  function getVerdictTheme(verdictStr: string) {
    switch (verdictStr) {
      case "TRUE":
      case "MOSTLY_TRUE":
        return {
          title: "VERIFIED",
          color: "text-verificator-verified",
          bg: "bg-verificator-verified/10",
          border: "border-verificator-verified/40",
          glow: "shadow-[0_0_40px_-5px_rgba(52,211,153,0.3)]",
          stroke: "#34D399",
          icon: ShieldCheck,
        };
      case "FALSE":
      case "MOSTLY_FALSE":
        return {
          title: "FALSE",
          color: "text-neonRed",
          bg: "bg-neonRed/10",
          border: "border-neonRed/40",
          glow: "shadow-[0_0_40px_-5px_rgba(255,23,68,0.3)]",
          stroke: "#FF1744",
          icon: ShieldAlert,
        };
      case "MIXTURE":
        return {
          title: "PARTIALLY VERIFIED",
          color: "text-verificator-warning",
          bg: "bg-verificator-warning/10",
          border: "border-verificator-warning/40",
          glow: "shadow-[0_0_40px_-5px_rgba(251,191,36,0.3)]",
          stroke: "#FBBF24",
          icon: AlertTriangle,
        };
      default:
        return {
          title: "UNVERIFIABLE",
          color: "text-muted-foreground",
          bg: "bg-graphite-elevated",
          border: "border-graphite-border",
          glow: "",
          stroke: "#A1A1AA",
          icon: HelpCircle,
        };
    }
  }

  const theme = getVerdictTheme(verdict);
  const Icon = theme.icon;

  // Circular gauge math
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (confidence / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`surface-card overflow-hidden border ${theme.border} ${theme.glow} bg-graphite-surface relative`}
    >
      <RedSweepBorder />

      {/* Top Banner */}
      <div className={`p-8 border-b border-graphite-border ${theme.bg} flex flex-col sm:flex-row items-center justify-between gap-6`}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-5"
        >
          <div className={`p-4 rounded-2xl ${theme.bg} border ${theme.border}`}>
            <Icon className={`h-10 w-10 ${theme.color}`} />
          </div>
          <div>
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              FINAL SYSTEM VERDICT
            </span>
            <h2 className={`font-display text-4xl sm:text-5xl font-black tracking-tight ${theme.color} mt-1`}>
              {theme.title}
            </h2>
          </div>
        </motion.div>

        {/* Circular SVG Confidence Gauge with Progressive Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-4 bg-graphite-bg/80 p-4 rounded-2xl border border-graphite-border"
        >
          <div className="relative flex items-center justify-center">
            <svg className="h-28 w-28 -rotate-90 transform">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-[#241014]"
                strokeWidth="8"
                fill="transparent"
              />
              <motion.circle
                cx="56"
                cy="56"
                r={radius}
                stroke={theme.stroke}
                strokeWidth="8"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: targetOffset }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-2xl font-black text-foreground">
                <AnimatedNumber value={confidence} duration={1200} />
              </span>
            </div>
          </div>
          <div className="flex flex-col font-mono text-xs">
            <span className="text-muted-foreground uppercase">CONFIDENCE</span>
            <span className="text-foreground font-bold">SCORE</span>
          </div>
        </motion.div>
      </div>

      <CardContent className="p-8 space-y-6">
        {/* Progressive Summary Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-2"
        >
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neonRed animate-pulse" />
            VERIFICATION SYNTHESIS SUMMARY
          </h3>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {result.summary}
          </p>
        </motion.div>

        {/* Explainable AI Reasoning Chain */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="p-5 rounded-2xl bg-graphite-bg border border-graphite-border space-y-3"
        >
          <span className="font-mono text-xs text-neonRed font-bold uppercase tracking-wider flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            EXPLAINABLE AI REASONING CHAIN
          </span>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs pt-1">
            <span className="px-3 py-1.5 rounded-xl bg-graphite-surface border border-graphite-border text-foreground">
              1. CLAIM ISOLATION
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1.5 rounded-xl bg-graphite-surface border border-graphite-border text-foreground">
              2. LIVE WEB MATCHING
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1.5 rounded-xl bg-graphite-surface border border-graphite-border text-foreground">
              3. SOURCE CREDIBILITY
            </span>
            <span className="text-muted-foreground">→</span>
            <span className={`px-3 py-1.5 rounded-xl bg-graphite-surface border ${theme.border} ${theme.color} font-bold`}>
              4. CONCLUSION
            </span>
          </div>
        </motion.div>

        {/* Score Breakdown Accordion */}
        {result.scoreBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="pt-2"
          >
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex justify-between items-center bg-graphite-bg border-graphite-border text-foreground hover:bg-graphite-elevated hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] h-12 rounded-xl font-mono text-xs uppercase tracking-wider transition-colors"
            >
              <span>View Score & Factor Breakdown</span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-graphite-border bg-graphite-bg p-6 text-sm text-muted-foreground leading-relaxed">
                    {result.scoreBreakdown}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </CardContent>
    </motion.div>
  );
}