"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, FileText, Link2, ChevronDown, Newspaper, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClaimsSectionProps {
  claims: any[];
}

const SOCIAL_DOMAINS = ['twitter.com', 'x.com', 'instagram.com', 'threads.net', 'facebook.com', 'tiktok.com', 'youtube.com'];

function isSocialMedia(url: string) {
  if (!url) return false;
  return SOCIAL_DOMAINS.some(domain => url.toLowerCase().includes(domain));
}

function getVerdictBadgeStyle(verdict: string) {
  switch (verdict) {
    case "TRUE":
    case "MOSTLY_TRUE":
      return "bg-verificator-verified/15 text-verificator-verified border-verificator-verified/30";
    case "MIXTURE":
      return "bg-verificator-warning/15 text-verificator-warning border-verificator-warning/30";
    case "MOSTLY_FALSE":
    case "FALSE":
      return "bg-neonRed/15 text-neonRed border-neonRed/30";
    default:
      return "bg-graphite-elevated text-muted-foreground border-graphite-border";
  }
}

function getCredibilityStyle(cred: string) {
  switch (cred) {
    case "HIGH":
      return "bg-verificator-verified/15 text-verificator-verified border-verificator-verified/30";
    case "MEDIUM":
      return "bg-verificator-warning/15 text-verificator-warning border-verificator-warning/30";
    default:
      return "bg-neonRed/15 text-neonRed border-neonRed/30";
  }
}

function EvidenceCard({ ev }: { ev: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="p-5 rounded-2xl bg-graphite-bg border border-graphite-border space-y-3 hover:border-neonRed/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h5 className="font-display text-sm font-semibold text-foreground line-clamp-2">
          {ev.title || "Source Reference"}
        </h5>
        <span className={`shrink-0 font-mono text-[10px] px-2.5 py-0.5 rounded-full border ${getCredibilityStyle(ev.credibility)}`}>
          {ev.credibility || "MEDIUM"} CREDIBILITY
        </span>
      </div>

      <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-neonRed/40 pl-3 py-1">
        "{ev.snippet}"
      </p>

      {ev.sourceUrl && (
        <a
          href={ev.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-neonRed hover:text-neonRed-bright transition-colors pt-1"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Inspect Source Document</span>
        </a>
      )}
    </motion.div>
  );
}

function ClaimCard({ claim, index }: { claim: any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const socialEvidence = claim.evidence?.filter((e: any) => isSocialMedia(e.sourceUrl)) || [];
  const newsEvidence = claim.evidence?.filter((e: any) => !isSocialMedia(e.sourceUrl)) || [];
  const totalEvidence = (claim.evidence || []).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="surface-card p-6 space-y-5 border border-graphite-border bg-graphite-surface overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-neonRed font-bold">
              CLAIM #{index + 1}
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">
            {claim.claimText}
          </h3>
        </div>
        <div className={`shrink-0 font-mono text-xs font-bold px-3.5 py-1.5 rounded-full border ${getVerdictBadgeStyle(claim.verdict)}`}>
          {claim.verdict?.replaceAll("_", " ")}
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {claim.explanation}
      </p>

      {totalEvidence > 0 && (
        <div className="pt-2 border-t border-graphite-border">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex justify-between items-center bg-graphite-bg border-graphite-border text-foreground hover:bg-graphite-elevated hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] h-11 rounded-xl font-mono text-xs uppercase tracking-wider transition-colors"
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-neonRed" />
              INSPECT EVIDENCE ({totalEvidence} SOURCES)
            </span>
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
                animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden space-y-6"
              >
                {newsEvidence.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neonRed-label font-bold">
                      <Newspaper className="h-4 w-4" /> NEWS & PRIMARY DOCUMENTATION
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {newsEvidence.map((ev: any, i: number) => (
                        <EvidenceCard key={i} ev={ev} />
                      ))}
                    </div>
                  </div>
                )}

                {socialEvidence.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neonRed font-bold">
                      <Smartphone className="h-4 w-4" /> SOCIAL MEDIA & PUBLIC DISCOURSE
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {socialEvidence.map((ev: any, i: number) => (
                        <EvidenceCard key={i} ev={ev} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default function ClaimsSection({ claims }: ClaimsSectionProps) {
  if (!claims || claims.length === 0) return null;

  return (
    <div className="space-y-6 pt-4">
      <motion.div
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <FileText className="h-5 w-5 text-neonRed" />
        <h2 className="font-display text-2xl font-bold text-foreground">
          CLAIMS BREAKDOWN ({claims.length})
        </h2>
      </motion.div>

      <div className="space-y-4">
        {claims.map((claim, index) => (
          <ClaimCard key={index} claim={claim} index={index} />
        ))}
      </div>
    </div>
  );
}