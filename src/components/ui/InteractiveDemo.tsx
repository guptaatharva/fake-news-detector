"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, ShieldCheck, ArrowRight, Loader2, ArrowUpRight, CheckCircle2, Terminal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SAMPLE_CLAIMS = [
  "New studies show coffee consumption increases life expectancy by 15%.",
  "The global semiconductor shortage is expected to end by Q3 2026.",
  "Mars rover discovers evidence of ancient microbial life in Jezero Crater."
];

export default function InteractiveDemo() {
  const [input, setInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [stage, setStage] = useState(0);

  const handleSimulate = (claim: string) => {
    setInput(claim);
    setIsSimulating(true);
    setStage(0);

    setTimeout(() => setStage(1), 1500); // Extracting
    setTimeout(() => setStage(2), 3500); // Searching
    setTimeout(() => setStage(3), 5500); // Cross-ref
    setTimeout(() => setStage(4), 7000); // Verdict
  };

  return (
    <div id="demo" className="mx-auto w-full max-w-5xl py-24 sm:py-32 px-6 relative z-20">
      {/* Section Header (Orchid Typography) */}
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-card dark:bg-white/[0.04] border border-border/70 dark:border-white/10 shadow-[0_0_15px_rgba(255,23,68,0.1)]">
          <Terminal className="h-3.5 w-3.5 text-neonRed" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            INTERACTIVE SIMULATION
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight text-foreground">
          TEST THE <span className="text-neonRed drop-shadow-[0_0_20px_rgba(255,23,68,0.35)]">INTELLIGENCE</span>
        </h2>
        <p className="text-muted-foreground font-sans text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Experience the autonomous verification engine in real time. Choose a sample claim below to witness evidence extraction and source corroboration.
        </p>
      </div>

      {/* Console Frame */}
      <div className="rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-[#07070a]/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-1.5 sm:p-2 relative overflow-hidden">
        {/* Subtle Ambient Red Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-neonRed/5 to-transparent pointer-events-none" />

        <div className="bg-background/80 dark:bg-black/60 rounded-[20px] border border-border/60 dark:border-white/10 p-6 sm:p-8">
          {/* Input Area */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neonRed" />
            </div>
            <input
              type="text"
              value={input}
              readOnly
              placeholder="Select a claim below to initiate analysis..."
              className="w-full bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/10 text-foreground font-mono text-xs sm:text-sm rounded-2xl py-4 sm:py-5 pl-12 pr-4 outline-none placeholder:text-muted-foreground transition-all"
            />
            {isSimulating && stage < 4 && (
              <div className="absolute inset-y-0 right-4 flex items-center">
                <Loader2 className="h-5 w-5 text-neonRed animate-spin" />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!isSimulating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid gap-3 sm:grid-cols-1"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-1.5 w-1.5 bg-neonRed rounded-full animate-ping" />
                  <span className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase font-semibold">SELECT TARGET CLAIM FOR INSTANT BENCHMARK</span>
                </div>
                {SAMPLE_CLAIMS.map((claim, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSimulate(claim)}
                    className="flex items-center justify-between p-4 sm:p-4.5 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.02] hover:bg-muted/60 dark:hover:bg-white/[0.06] hover:border-neonRed/50 hover:shadow-[0_0_20px_rgba(255,23,68,0.15)] transition-all text-left group"
                  >
                    <span className="text-xs sm:text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1 pr-4">
                      "{claim}"
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-neonRed shrink-0 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </motion.div>
            )}

            {isSimulating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-3.5">
                  <SimStep active={stage >= 1} label="EXTRACTING ATOMIC CLAIMS & ENTITIES" />
                  <SimStep active={stage >= 2} label="QUERYING HIGH-AUTHORITY GLOBAL SOURCES" />
                  <SimStep active={stage >= 3} label="CROSS-REFERENCING CONSENSUS & RECENCY" />
                  
                  {stage >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-6 rounded-2xl bg-verificator-verified/10 border border-verificator-verified/30 flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-verificator-verified/20 border border-verificator-verified/40">
                          <ShieldCheck className="h-6 w-6 text-verificator-verified" />
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-verificator-verified text-lg tracking-wide">VERIFIED BY MULTI-SOURCE EVIDENCE</h4>
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            Corroborated across primary research publications with 94% source authority score.
                          </p>
                        </div>
                      </div>
                      <div className="sm:ml-auto">
                        <Link 
                          href="/dashboard"
                          className={cn(
                            buttonVariants({ variant: "outline" }),
                            "border-neonRed text-neonRed hover:bg-neonRed/10 font-mono text-xs inline-flex items-center"
                          )}
                        >
                          OPEN WORKSPACE <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {stage >= 4 && (
                  <div className="flex justify-center mt-6">
                     <button 
                       onClick={() => setIsSimulating(false)} 
                       className="text-[11px] font-mono text-muted-foreground hover:text-neonRed transition-colors uppercase tracking-wider underline underline-offset-4"
                     >
                       RESET SIMULATION
                     </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SimStep({ active, label }: { active: boolean, label: string }) {
  return (
    <div className="flex items-center gap-3.5 font-mono text-xs sm:text-sm p-2 rounded-xl bg-card/30 dark:bg-white/[0.01] border border-border/40">
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${active ? 'bg-neonRed/20 border-neonRed text-neonRed' : 'border-border bg-muted/40 text-muted-foreground'}`}>
        {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
      </div>
      <span className={active ? 'text-foreground font-semibold' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
