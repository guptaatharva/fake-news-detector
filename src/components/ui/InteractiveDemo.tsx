"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, ShieldCheck, ArrowRight, Loader2, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto w-full max-w-4xl pt-16 pb-24 px-6 relative z-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-display font-black tracking-wider text-foreground mb-4">
          TEST THE <span className="text-neonRed drop-shadow-[0_0_15px_rgba(255,23,68,0.5)]">INTELLIGENCE</span>
        </h2>
        <p className="text-muted-foreground font-mono text-sm max-w-2xl mx-auto">
          Run a simulated verification directly from the command line. Select a sample claim below to witness the evidence engine in real-time.
        </p>
      </div>

      <div className="rounded-3xl border border-graphite-border bg-graphite-surface/80 backdrop-blur-xl shadow-2xl p-1 relative overflow-hidden">
        {/* Glow behind */}
        <div className="absolute inset-0 bg-gradient-to-b from-neonRed/5 to-transparent pointer-events-none" />

        <div className="bg-graphite-bg rounded-[22px] border border-graphite-border p-6 md:p-8">
          {/* Input Area */}
          <div className="relative mb-8">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neonRed" />
            </div>
            <input
              type="text"
              value={input}
              readOnly
              placeholder="Select a claim below to initiate analysis..."
              className="w-full bg-graphite-elevated border border-graphite-border-sec text-foreground font-mono text-sm md:text-base rounded-2xl py-5 pl-12 pr-4 outline-none placeholder:text-muted-foreground transition-all"
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
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 bg-neonRed rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Select Target Claim</span>
                </div>
                {SAMPLE_CLAIMS.map((claim, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSimulate(claim)}
                    className="flex items-center justify-between p-4 rounded-xl border border-graphite-border bg-graphite-surface hover:bg-graphite-elevated hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] hover:border-neonRed/40 transition-all text-left group"
                  >
                    <span className="text-sm font-mono text-muted-foreground group-hover:text-accent transition-colors line-clamp-1 pr-4">
                      "{claim}"
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-neonRed shrink-0" />
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
                <div className="flex flex-col gap-4">
                  <SimStep active={stage >= 1} label="EXTRACTING CORE ENTITIES" />
                  <SimStep active={stage >= 2} label="QUERYING GLOBAL DATABASES" />
                  <SimStep active={stage >= 3} label="CROSS-REFERENCING SOURCES" />
                  
                  {stage >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-6 rounded-2xl bg-verificator-unverifiable/10 border border-verificator-unverifiable/30 flex items-center gap-6"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-verificator-unverifiable/20">
                        <ShieldCheck className="h-6 w-6 text-verificator-unverifiable" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-verificator-unverifiable text-lg tracking-wide">ANALYSIS COMPLETE</h4>
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                          Log in to view full intelligence report, confidence metrics, and source breakdown.
                        </p>
                      </div>
                      <div className="ml-auto">
                        <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent font-mono text-xs hidden sm:flex">
                          VIEW FULL REPORT <ArrowUpRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                {stage >= 4 && (
                  <div className="flex justify-center mt-6">
                     <button onClick={() => setIsSimulating(false)} className="text-[10px] font-mono text-muted-foreground hover:text-neonRed transition-colors underline underline-offset-4">
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
    <div className="flex items-center gap-4 font-mono text-sm">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${active ? 'bg-neonRed/20 border-neonRed text-neonRed' : 'border-graphite-border-sec bg-graphite-elevated text-muted-foreground'}`}>
        {active ? <CheckCircle2 className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      </div>
      <span className={active ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
