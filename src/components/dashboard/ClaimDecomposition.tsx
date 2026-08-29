"use client";

import { motion } from "framer-motion";
import { GitBranch, ShieldCheck, ShieldAlert, XOctagon } from "lucide-react";

interface Claim {
  id: string;
  text: string;
  verdict: "VERIFIED" | "PARTIALLY VERIFIED" | "MISLEADING" | "UNVERIFIED" | "FALSE";
  confidence: number;
}

interface ClaimDecompositionProps {
  claims: Claim[];
}

export default function ClaimDecomposition({ claims }: ClaimDecompositionProps) {
  const getVerdictStyles = (verdict: string) => {
    switch(verdict) {
      case "VERIFIED": return { color: "text-verificator-verified", border: "border-verificator-verified/30", bg: "bg-verificator-verified/10", icon: ShieldCheck };
      case "PARTIALLY VERIFIED": return { color: "text-verificator-mostlyTrue", border: "border-verificator-mostlyTrue/30", bg: "bg-verificator-mostlyTrue/10", icon: ShieldAlert };
      case "MISLEADING": return { color: "text-verificator-mixture", border: "border-verificator-mixture/30", bg: "bg-verificator-mixture/10", icon: ShieldAlert };
      case "UNVERIFIED": return { color: "text-verificator-unverifiable", border: "border-verificator-unverifiable/30", bg: "bg-verificator-unverifiable/10", icon: ShieldAlert };
      case "FALSE": return { color: "text-verificator-false", border: "border-verificator-false/30", bg: "bg-verificator-false/10", icon: XOctagon };
      default: return { color: "text-muted-foreground", border: "border-graphite-border", bg: "bg-graphite-bg", icon: ShieldCheck };
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <GitBranch className="w-5 h-5 text-neonRed" />
        <h3 className="font-display text-lg font-bold text-foreground tracking-wide">
          CLAIM DECOMPOSITION
        </h3>
      </div>

      <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-[#241014]">
        {claims.map((claim, idx) => {
          const style = getVerdictStyles(claim.verdict);
          const Icon = style.icon;

          return (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15 }}
              className="relative pl-12"
            >
              {/* Timeline dot */}
              <div className={`absolute left-[15px] top-4 w-2.5 h-2.5 rounded-full ${style.bg} border border-[#0B0B0D] z-10 shadow-[0_0_0_4px_#0B0B0D]`} />
              
              <div className={`p-5 rounded-2xl bg-graphite-bg border ${style.border} hover:border-neonRed/50 transition-colors group cursor-default`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest bg-graphite-elevated px-2 py-1 rounded border border-graphite-border">
                    CLAIM {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  <div className={`flex items-center gap-1.5 font-mono text-xs font-bold ${style.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {claim.verdict}
                  </div>
                </div>
                
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  "{claim.text}"
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-graphite-border">
                  <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                    CONFIDENCE: <span className={style.color}>{claim.confidence}%</span>
                  </div>
                  <button className="text-[10px] font-mono text-neonRed uppercase tracking-widest hover:underline underline-offset-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Sources →
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
