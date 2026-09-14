"use client";

import { motion } from "framer-motion";
import { Search, Globe, BrainCircuit, Loader2, Terminal, ShieldCheck } from "lucide-react";

interface AgentTerminalProps {
  stage: "idle" | "extracting" | "searching" | "debating" | "synthesizing" | "complete";
  logs: string[];
}

export default function AgentTerminal({ stage, logs }: AgentTerminalProps) {
  const steps = [
    { id: "extracting", title: "CLAIM EXTRACTION", icon: Search, stageNum: "01" },
    { id: "searching", title: "LIVE WEB SEARCH", icon: Globe, stageNum: "02" },
    { id: "debating", title: "MULTI-AGENT DEBATE", icon: BrainCircuit, stageNum: "03" },
    { id: "complete", title: "GENERATING REPORT", icon: ShieldCheck, stageNum: "04" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card overflow-hidden shadow-2xl border border-graphite-border bg-graphite-surface"
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-graphite-border px-6 py-4 bg-graphite-sub">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-neonRed" />
          <div>
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
              AUTONOMOUS VERIFICATION AGENT
            </h3>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              LIVE MULTI-STAGE INVESTIGATION IN PROGRESS
            </p>
          </div>
        </div>

        <span className="font-mono text-xs text-neonRed bg-neonRed-dark/30 px-3 py-1 rounded-full border border-neonRed-dark/60">
          AGENT ID #VERACIUS-LIVE
        </span>
      </div>

      {/* Stage Nodes Progress */}
      <div className="flex flex-row overflow-x-auto gap-3 p-6 border-b border-graphite-border bg-graphite-bg/60 scrollbar-hide">
        {steps.map((step) => {
          const Icon = step.icon;
          const active =
            stage === step.id ||
            (stage === "searching" && step.id === "extracting") ||
            (stage === "debating" && (step.id === "extracting" || step.id === "searching")) ||
            stage === "complete";

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-2xl border transition-all flex-1 min-w-[200px] shrink-0 ${
                active
                  ? "bg-graphite-elevated border-neonRed/50 shadow-[0_0_15px_rgba(255,23,68,0.15)]"
                  : "bg-graphite-surface/40 border-graphite-border opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl font-mono text-xs font-bold shrink-0 ${
                    active ? "bg-neonRed text-foreground" : "bg-graphite-sub text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">
                    STAGE {step.stageNum}
                  </p>
                  <p className="font-display text-xs font-semibold text-foreground whitespace-normal">
                    {step.title}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Terminal Log Console */}
      <div className="p-6 bg-graphite-bg space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-graphite-border">
          <span className="flex items-center gap-2 text-neonRed-bright font-semibold">
            <Terminal className="h-4 w-4" />
            LIVE AGENT LOG STREAM
          </span>
          <span className="text-[10px] uppercase tracking-widest">
            ENCRYPTED SESSION
          </span>
        </div>

        <div className="h-64 overflow-y-auto rounded-2xl bg-graphite-sub p-4 text-xs space-y-2 border border-graphite-border">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-foreground flex items-start gap-2 leading-relaxed"
            >
              <span className="text-neonRed shrink-0">&gt;</span>
              <span>{log}</span>
            </motion.div>
          ))}

          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-neonRed flex items-center gap-1 pt-1"
          >
            <span>▋</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              AWAITING STREAM PROTOCOL...
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}