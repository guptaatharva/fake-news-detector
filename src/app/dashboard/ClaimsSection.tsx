"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, FileText, Link2, ChevronDown, ChevronUp, Newspaper, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClaimsSectionProps {
  claims: any[];
}

const SOCIAL_DOMAINS = ['twitter.com', 'x.com', 'instagram.com', 'threads.net', 'facebook.com', 'tiktok.com', 'youtube.com'];

function isSocialMedia(url: string) {
  if (!url) return false;
  return SOCIAL_DOMAINS.some(domain => url.toLowerCase().includes(domain));
}

function badge(verdict: string) {
  switch (verdict) {
    case "TRUE": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "MOSTLY_TRUE": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "MIXTURE": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "MOSTLY_FALSE": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "FALSE": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function credibility(color: string) {
  switch (color) {
    case "HIGH": return "bg-emerald-500/20 text-emerald-400";
    case "MEDIUM": return "bg-amber-500/20 text-amber-400";
    default: return "bg-red-500/20 text-red-400";
  }
}

function EvidenceCard({ ev }: { ev: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-center justify-between">
        <h5 className="font-semibold text-white line-clamp-2 pr-4">{ev.title}</h5>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${credibility(ev.credibility)}`}>
          {ev.credibility}
        </span>
      </div>
      <p className="mt-4 italic leading-7 text-gray-400">"{ev.snippet}"</p>
      {ev.sourceUrl && (
        <a
          href={ev.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-teal-400 hover:text-teal-300"
        >
          <ExternalLink className="h-4 w-4" />
          View Source
        </a>
      )}
    </div>
  );
}

function ClaimCard({ claim, index }: { claim: any, index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const socialEvidence = claim.evidence?.filter((e: any) => isSocialMedia(e.sourceUrl)) || [];
  const newsEvidence = claim.evidence?.filter((e: any) => !isSocialMedia(e.sourceUrl)) || [];
  const totalEvidence = (claim.evidence || []).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl overflow-hidden"
    >
      <div className="p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{claim.claimText}</h3>
            <p className="mt-4 leading-8 text-gray-400">{claim.explanation}</p>
          </div>
          <div className={`shrink-0 rounded-full border px-5 py-2 text-sm font-bold ${badge(claim.verdict)}`}>
            {claim.verdict.replaceAll("_", " ")}
          </div>
        </div>

        {totalEvidence > 0 && (
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex justify-between items-center bg-[#181818] border-white/10 text-white hover:bg-[#202020] hover:text-white h-12 rounded-xl"
            >
              <span className="font-semibold text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-teal-400" />
                View Evidence ({totalEvidence} Sources)
              </span>
              {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </Button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden space-y-8"
                >
                  {newsEvidence.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Newspaper className="h-5 w-5 text-blue-400" /> News & General Pages
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        {newsEvidence.map((ev: any, i: number) => <EvidenceCard key={i} ev={ev} />)}
                      </div>
                    </div>
                  )}

                  {socialEvidence.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Smartphone className="h-5 w-5 text-pink-400" /> Social Media
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        {socialEvidence.map((ev: any, i: number) => <EvidenceCard key={i} ev={ev} />)}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ClaimsSection({ claims }: ClaimsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-teal-400" />
        <h2 className="text-3xl font-bold text-white">Claims Breakdown</h2>
      </div>
      {claims.map((claim, index) => (
        <ClaimCard key={index} claim={claim} index={index} />
      ))}
    </div>
  );
}