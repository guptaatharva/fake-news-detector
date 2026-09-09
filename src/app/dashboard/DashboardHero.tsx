"use client";

import { motion } from "framer-motion";
import { Sparkles, Terminal } from "lucide-react";

export default function DashboardHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-2 pb-6"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-graphite-surface border border-graphite-border-sec">
        <Sparkles className="h-3.5 w-3.5 text-neonRed" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          REAL-TIME INTELLIGENCE COMMAND CENTER
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-foreground">
            Verification <span className="bg-gradient-to-r from-[#FF1744] via-[#FF4D6D] to-[#FF1744] bg-clip-text text-transparent">Workspace</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Input a news URL, raw text passage, or specific claim to trigger multi-stage primary source corroboration.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground bg-graphite-surface px-4 py-2 rounded-2xl border border-graphite-border shrink-0">
          <Terminal className="h-4 w-4 text-neonRed" />
          <span>V2.4 ENGINE READY</span>
        </div>
      </div>
    </motion.div>
  );
}