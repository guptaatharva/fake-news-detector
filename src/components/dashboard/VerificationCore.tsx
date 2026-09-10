"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Search, Database, FileSearch, ShieldCheck, CheckCircle2, ChevronRight, Activity } from "lucide-react";

interface VerificationCoreProps {
  status: "idle" | "processing" | "complete";
  activeStageIndex?: number;
  onNewAnalysis?: () => void;
}

const stages = [
  { id: "claim", label: "CLAIM", icon: FileText },
  { id: "analysis", label: "ANALYSIS", icon: Search },
  { id: "sources", label: "SOURCES", icon: Database },
  { id: "evidence", label: "EVIDENCE", icon: FileSearch },
  { id: "verdict", label: "VERDICT", icon: ShieldCheck },
];

export default function VerificationCore({ status, activeStageIndex = 0, onNewAnalysis }: VerificationCoreProps) {
  // If complete, force all active
  const currentIndex = status === "complete" ? stages.length - 1 : activeStageIndex;

  return (
    <div className="w-full bg-graphite-surface border border-graphite-border rounded-2xl p-6 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10"
           style={{
             backgroundImage: `linear-gradient(to right, #35151B 1px, transparent 1px), linear-gradient(to bottom, #35151B 1px, transparent 1px)`,
             backgroundSize: '20px 20px'
           }}
      />
      
      {/* Processing overlay scan line */}
      {status === "processing" && (
        <motion.div 
          className="absolute inset-0 w-full h-[2px] bg-neonRed/30 shadow-[0_0_20px_rgba(255,23,68,0.5)] z-0"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'processing' ? 'animate-ping bg-neonRed' : 'bg-verificator-verified'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'processing' ? 'bg-neonRed' : 'bg-verificator-verified'}`}></span>
            </span>
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {status === "processing" ? "CORE PROCESSING ACTIVE" : status === "complete" ? "VERIFICATION COMPLETE" : "SYSTEM IDLE"}
            </span>
          </div>
          {status === "processing" && (
            <div className="flex items-center gap-2 text-neonRed font-mono text-[10px] animate-pulse">
              <Activity className="w-3 h-3" />
              <span>EVALUATING</span>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {stages.map((stage, idx) => {
            const isActive = idx <= currentIndex;
            const isCurrent = idx === currentIndex && status === "processing";
            const Icon = stage.icon;

            return (
              <div key={stage.id} className="flex items-center w-full md:w-auto flex-1">
                <div className="flex flex-col items-center gap-3 w-full relative group">
                  <motion.div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-500 relative z-10 ${
                      isActive 
                        ? isCurrent
                          ? "bg-graphite-elevated border-neonRed text-neonRed shadow-[0_0_15px_rgba(255,23,68,0.4)]"
                          : "bg-neonRed/10 border-neonRed/50 text-neonRed"
                        : "bg-graphite-bg border-graphite-border text-[#35151B]"
                    }`}
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {isActive && !isCurrent ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </motion.div>
                  
                  <span className={`font-mono text-[10px] tracking-widest transition-colors duration-500 ${
                    isActive ? "text-foreground" : "text-[#35151B]"
                  }`}>
                    {stage.label}
                  </span>
                </div>

                {idx < stages.length - 1 && (
                  <div className="hidden md:flex flex-1 h-px bg-[#241014] relative mx-2">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-neonRed"
                      initial={{ width: "0%" }}
                      animate={{ width: isActive && !isCurrent ? "100%" : isCurrent ? "50%" : "0%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <ChevronRight className={`absolute top-1/2 -translate-y-1/2 right-1/2 translate-x-1/2 w-4 h-4 ${
                      isActive && !isCurrent ? "text-neonRed" : "text-[#241014]"
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
