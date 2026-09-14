"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, AlertTriangle, ShieldQuestion, XOctagon, Scale } from "lucide-react";

const verdicts = [
  {
    status: "VERIFIED",
    color: "text-verificator-verified",
    bg: "bg-verificator-verified/10",
    border: "border-verificator-verified/30",
    icon: ShieldCheck,
    desc: "The claim is completely accurate and supported by high-authority sources without contradiction."
  },
  {
    status: "PARTIALLY VERIFIED",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: ShieldAlert,
    desc: "The core claim is true, but contains minor inaccuracies, missing context, or relies on less definitive sources."
  },
  {
    status: "MISLEADING",
    color: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: AlertTriangle,
    desc: "A mix of truth and falsehoods, or real facts framed intentionally to imply an unsubstantiated conclusion."
  },
  {
    status: "UNVERIFIED",
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    icon: ShieldQuestion,
    desc: "Insufficient authoritative evidence exists to definitively prove or disprove the claim."
  },
  {
    status: "FALSE",
    color: "text-neonRed",
    bg: "bg-neonRed/10",
    border: "border-neonRed/30",
    icon: XOctagon,
    desc: "The claim is demonstrably inaccurate and directly contradicted by established primary evidence."
  }
];

export default function NuancedVerdictGuide() {
  return (
    <div className="mx-auto w-full max-w-6xl py-24 sm:py-32 px-6 relative z-20">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
        {/* Left Column: Heading & Narrative */}
        <div className="flex-1 space-y-5 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-card dark:bg-white/[0.04] border border-border/70 dark:border-white/10 shadow-[0_0_15px_rgba(255,23,68,0.1)]">
            <Scale className="h-3.5 w-3.5 text-neonRed" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              VERDICT TAXONOMY
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-foreground leading-[1.08]">
            WHY NOT JUST <br className="hidden sm:inline" />
            <span className="text-neonRed drop-shadow-[0_0_20px_rgba(255,23,68,0.3)]">
              TRUE OR FALSE?
            </span>
          </h2>

          <p className="text-muted-foreground font-sans text-base sm:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
            Information rarely exists in binary absolutes. VeraCius decomposes statements into five nuanced evidentiary tiers, providing exact epistemological precision instead of oversimplified labels.
          </p>
        </div>

        {/* Right Column: 5 Verdict Cards */}
        <div className="flex-1 w-full flex flex-col gap-3 sm:gap-3.5">
          {verdicts.map((item, i) => (
            <motion.div
              key={item.status}
              initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl border ${item.bg} ${item.border} backdrop-blur-xl bg-card/80 dark:bg-[#07070a]/80 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:scale-[1.01] transition-transform`}
            >
              <div className={`mt-0.5 shrink-0 p-2 rounded-xl bg-card dark:bg-white/[0.04] border border-border/60 ${item.color}`}>
                <item.icon className="h-4 sm:h-5 w-4 sm:w-5" />
              </div>
              <div className="space-y-1">
                <h4 className={`font-display font-bold tracking-wider text-xs sm:text-sm ${item.color}`}>
                  {item.status}
                </h4>
                <p className="text-xs font-sans text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
