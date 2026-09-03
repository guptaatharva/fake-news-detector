"use client";

import { motion } from "framer-motion";
import { GitBranch, ShieldCheck, ShieldAlert, XOctagon, ExternalLink } from "lucide-react";

export interface EvidenceSource {
  title?: string;
  source?: string;
  domain?: string;
  sourceUrl?: string;
  url?: string;
  snippet?: string;
  credibility?: "HIGH" | "MEDIUM" | "LOW";
}

export interface Claim {
  id: string;
  text: string;
  verdict: "VERIFIED" | "PARTIALLY VERIFIED" | "MISLEADING" | "UNVERIFIED" | "FALSE";
  confidence: number;
  explanation?: string;
  sourceUrl?: string;
  evidence?: EvidenceSource[];
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
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-neonRed" />
          <h3 className="font-display text-lg font-bold text-foreground tracking-wide">
            CLAIM DECOMPOSITION
          </h3>
        </div>
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider bg-graphite-surface px-2.5 py-1 rounded-full border border-graphite-border">
          {claims.length} {claims.length === 1 ? 'CLAIM' : 'CLAIMS'} IDENTIFIED
        </span>
      </div>

      <div className="w-full max-h-[780px] overflow-y-auto pr-1 sm:pr-2 space-y-4 relative before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-neonRed/20">
        {claims.map((claim, idx) => {
          const style = getVerdictStyles(claim.verdict);
          const Icon = style.icon;

          // Resolve clean destination publisher URL
          const resolvedUrl =
            claim.sourceUrl && claim.sourceUrl.startsWith('http') && !claim.sourceUrl.includes('news.google.com')
              ? claim.sourceUrl
              : claim.evidence?.find(e => (e.sourceUrl || e.url)?.startsWith('http') && !(e.sourceUrl || e.url)?.includes('news.google.com'))?.sourceUrl;

          return (
            <motion.div
              key={claim.id || idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
              className="relative pl-12"
            >
              {/* Timeline dot */}
              <div className={`absolute left-[15px] top-4 w-2.5 h-2.5 rounded-full ${style.bg} border border-background z-10 shadow-[0_0_0_4px_rgba(11,11,13,0.9)]`} />
              
              <div className={`p-5 rounded-2xl bg-graphite-bg border ${style.border} hover:border-neonRed/50 transition-all duration-300 group shadow-sm`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest bg-graphite-elevated px-2 py-1 rounded border border-graphite-border">
                    CLAIM {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  <div className={`flex items-center gap-1.5 font-mono text-xs font-bold ${style.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {claim.verdict}
                  </div>
                </div>
                
                <p className="text-sm text-foreground leading-relaxed mb-3 break-words">
                  "{claim.text}"
                </p>

                {claim.explanation && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 border-l-2 border-neonRed/30 pl-3 py-0.5 italic">
                    {claim.explanation}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-graphite-border flex-wrap gap-2">
                  <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                    CONFIDENCE: <span className={style.color}>{claim.confidence}%</span>
                  </div>

                  {resolvedUrl ? (
                    <a
                      href={resolvedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono text-neonRed hover:text-neonRed-bright uppercase tracking-widest hover:underline underline-offset-4 transition-colors font-bold cursor-pointer drop-shadow-[0_0_6px_rgba(255,23,68,0.4)]"
                      title={`Open original publisher article: ${resolvedUrl}`}
                    >
                      <span>VIEW SOURCES</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                      EVIDENCE MAPPED
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
