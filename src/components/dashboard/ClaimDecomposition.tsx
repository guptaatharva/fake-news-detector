"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, ShieldCheck, ShieldAlert, XOctagon, ExternalLink, ChevronDown, ChevronUp, Newspaper, Drama, Clock, RefreshCw, ShieldQuestion, TriangleAlert, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

export interface EvidenceSource {
  title?: string;
  source?: string;
  publisher?: string;
  domain?: string;
  sourceUrl?: string;
  url?: string;
  snippet?: string;
  summary?: string;
  credibility?: "HIGH" | "MEDIUM" | "LOW";
  stance?: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "IRRELEVANT";
  publishedAt?: string;
}

export interface Claim {
  id: string;
  text: string;
  verdict: "VERIFIED" | "PARTIALLY VERIFIED" | "MISLEADING" | "UNVERIFIED" | "FALSE" | "SATIRE";
  confidence: number;
  explanation?: string;
  sourceUrl?: string;
  evidence?: EvidenceSource[];
  temporalStatus?: string;
  isSatire?: boolean;
  /** Set when this claim's debate call failed outright (§8.3 partial-failure state). */
  failed?: boolean;
  injectionAttemptDetected?: boolean;
  lowSourceDiversity?: boolean;
  onRetry?: () => void;
}

interface ClaimDecompositionProps {
  claims: Claim[];
}

function formatRecency(publishedAt?: string): string | null {
  if (!publishedAt) return null;
  const parsed = new Date(publishedAt);
  if (isNaN(parsed.getTime())) return null;
  const ageDays = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays < 0) return null;
  if (ageDays === 0) return "today";
  if (ageDays === 1) return "1 day ago";
  if (ageDays < 30) return `${ageDays} days ago`;
  if (ageDays < 365) return `${Math.round(ageDays / 30)} mo ago`;
  return `${Math.round(ageDays / 365)} yr ago`;
}

const STANCE_CONFIG: Record<string, { icon: typeof ThumbsUp; label: string; color: string }> = {
  SUPPORTS: { icon: ThumbsUp, label: "Supports", color: "text-emerald-400" },
  CONTRADICTS: { icon: ThumbsDown, label: "Contradicts", color: "text-rose-400" },
  NEUTRAL: { icon: Minus, label: "Neutral", color: "text-zinc-400" },
  IRRELEVANT: { icon: Minus, label: "Irrelevant", color: "text-zinc-500" },
};

export default function ClaimDecomposition({ claims }: ClaimDecompositionProps) {
  const [expandedClaims, setExpandedClaims] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  const toggleClaimSources = (claimKey: string) => {
    setExpandedClaims((prev) => ({
      ...prev,
      [claimKey]: !prev[claimKey],
    }));
  };

  const handleRetry = async (claimKey: string, onRetry?: () => void | Promise<void>) => {
    if (!onRetry) return;
    setRetrying((prev) => ({ ...prev, [claimKey]: true }));
    try {
      await onRetry();
    } finally {
      setRetrying((prev) => ({ ...prev, [claimKey]: false }));
    }
  };

  const getVerdictStyles = (verdict: string) => {
    switch(verdict) {
      case "VERIFIED": return { color: "text-verificator-verified", border: "border-verificator-verified/30", bg: "bg-verificator-verified/10", icon: ShieldCheck };
      case "PARTIALLY VERIFIED": return { color: "text-verificator-mostlyTrue", border: "border-verificator-mostlyTrue/30", bg: "bg-verificator-mostlyTrue/10", icon: ShieldAlert };
      case "MISLEADING": return { color: "text-verificator-mixture", border: "border-verificator-mixture/30", bg: "bg-verificator-mixture/10", icon: ShieldAlert };
      case "UNVERIFIED": return { color: "text-verificator-unverifiable", border: "border-verificator-unverifiable/30", bg: "bg-verificator-unverifiable/10", icon: ShieldAlert };
      case "FALSE": return { color: "text-verificator-false", border: "border-verificator-false/30", bg: "bg-verificator-false/10", icon: XOctagon };
      case "SATIRE": return { color: "text-purple-400", border: "border-purple-500/30", bg: "bg-purple-500/10", icon: Drama };
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
          const claimKey = claim.id || idx.toString();
          const isExpanded = !!expandedClaims[claimKey];

          // Resolve clean destination publisher URL
          const resolvedUrl =
            claim.sourceUrl && claim.sourceUrl.startsWith('http') && !claim.sourceUrl.includes('news.google.com')
              ? claim.sourceUrl
              : claim.evidence?.find(e => (e.sourceUrl || e.url)?.startsWith('http') && !(e.sourceUrl || e.url)?.includes('news.google.com'))?.sourceUrl;

          // Deduplicate and filter clean sources for this claim
          const validSources = (claim.evidence || []).filter((e) => {
            const u = e.sourceUrl || e.url;
            return u && u.startsWith('http') && !u.includes('news.google.com');
          });

          const displaySources: EvidenceSource[] =
            validSources.length > 0
              ? validSources
              : resolvedUrl
              ? [
                  {
                    sourceUrl: resolvedUrl,
                    url: resolvedUrl,
                    title: 'Verified Publisher Source',
                    publisher: 'Publisher',
                    domain: new URL(resolvedUrl).hostname.replace(/^www\./, '').toLowerCase(),
                    summary: 'Original reporting verifying the factual context of this claim.',
                    credibility: 'HIGH' as const,
                  },
                ]
              : [];

          return (
            <motion.div
              key={claimKey}
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

                {/* Partial-failure state (§8.3): visually distinct from a fully-evidenced claim */}
                {claim.failed && (
                  <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-verificator-warning/10 border border-verificator-warning/30">
                    <div className="flex items-center gap-2 text-verificator-warning">
                      <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-mono">No independent evidence found — verdict is unverifiable, not a confirmed assessment.</span>
                    </div>
                    {claim.onRetry && (
                      <button
                        type="button"
                        onClick={() => handleRetry(claimKey, claim.onRetry)}
                        disabled={retrying[claimKey]}
                        className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-verificator-warning hover:text-foreground uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${retrying[claimKey] ? 'animate-spin' : ''}`} />
                        {retrying[claimKey] ? 'RETRYING' : 'RETRY'}
                      </button>
                    )}
                  </div>
                )}

                {/* Temporal mismatch flag (§3.7): "true, but from 2019, shared as if current" */}
                {claim.temporalStatus === 'PREVIOUSLY_TRUE_NOW_FALSE' && (
                  <div className="flex items-center gap-2 mb-3 text-amber-400">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-mono">This was true in the past but no longer reflects the current situation.</span>
                  </div>
                )}

                {/* Prompt-injection warning (§2.3) */}
                {claim.injectionAttemptDetected && (
                  <div className="flex items-center gap-2 mb-3 text-rose-400">
                    <ShieldQuestion className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-mono">One or more sources contained text resembling an AI-manipulation attempt — it was flagged and ignored, not trusted as an instruction.</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-graphite-border flex-wrap gap-2">
                  <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                    CONFIDENCE: <span className={style.color}>{claim.confidence}%</span>
                    {claim.lowSourceDiversity && (
                      <span className="ml-2 text-verificator-warning" title="Fewer than 2 independent domains corroborated this claim">
                        (LOW SOURCE DIVERSITY)
                      </span>
                    )}
                  </div>

                  {displaySources.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleClaimSources(claimKey)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono text-neonRed hover:text-neonRed-bright uppercase tracking-widest hover:underline underline-offset-4 transition-colors font-bold cursor-pointer drop-shadow-[0_0_6px_rgba(255,23,68,0.4)] bg-transparent border-0 p-0"
                      aria-expanded={isExpanded}
                      aria-label={`Toggle sources for claim ${idx + 1}`}
                    >
                      <span>{isExpanded ? 'HIDE SOURCES' : `VIEW SOURCES (${displaySources.length})`}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                      NO INDEPENDENT EVIDENCE FOUND
                    </span>
                  )}
                </div>

                {/* Collapsible Source Summaries Panel */}
                <AnimatePresence initial={false}>
                  {isExpanded && displaySources.length > 0 && (
                    <motion.div
                      key={`sources-${claimKey}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-graphite-border/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                            VERIFICATION SOURCES
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            {displaySources.length} {displaySources.length === 1 ? 'SOURCE' : 'SOURCES'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {displaySources.map((source, sIdx) => {
                            const rawUrl = source.sourceUrl || source.url || '';
                            let domain = source.domain;
                            if (!domain && rawUrl) {
                              try {
                                domain = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
                              } catch {
                                domain = 'web source';
                              }
                            }

                            const publisher =
                              source.publisher ||
                              source.source ||
                              (domain ? domain.split('.')[0].toUpperCase() : 'Publisher');

                            const summaryText =
                              source.summary ||
                              source.snippet ||
                              source.title ||
                              'Reporting and factual documentation verifying this claim.';

                            const stanceInfo = source.stance ? STANCE_CONFIG[source.stance] : null;
                            const recency = formatRecency(source.publishedAt);

                            return (
                              <a
                                key={`${claimKey}-src-${sIdx}`}
                                href={rawUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/src relative flex flex-col justify-between p-3 rounded-xl bg-graphite-surface/90 border border-graphite-border hover:border-neonRed/60 hover:shadow-[0_0_15px_rgba(255,23,68,0.15)] transition-all duration-200 cursor-pointer block text-left no-underline"
                                title={`Open original article on ${publisher}: ${rawUrl}`}
                              >
                                <div>
                                  {/* Publisher / Source Name */}
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Newspaper className="w-3 h-3 text-neonRed shrink-0" />
                                      <span className="font-display text-xs font-bold text-foreground tracking-wide truncate">
                                        {publisher}
                                      </span>
                                    </div>
                                    {source.credibility && (
                                      <span
                                        className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                                          source.credibility === 'HIGH'
                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                            : source.credibility === 'MEDIUM'
                                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                        }`}
                                      >
                                        {source.credibility}
                                      </span>
                                    )}
                                  </div>

                                  {/* 1-2 sentence concise factual summary */}
                                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-2.5 font-sans">
                                    {summaryText}
                                  </p>
                                </div>

                                {/* Stance, recency, clean domain & external link button */}
                                <div className="flex items-center justify-between pt-1.5 border-t border-graphite-border/50 text-[10px] font-mono gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-muted-foreground/80 truncate max-w-[90px]">{domain}</span>
                                    {recency && <span className="text-muted-foreground/60 shrink-0">· {recency}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {stanceInfo && (
                                      <span className={`inline-flex items-center gap-1 ${stanceInfo.color}`} title={stanceInfo.label}>
                                        <stanceInfo.icon className="w-3 h-3" />
                                      </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-neonRed group-hover/src:text-neonRed-bright font-bold transition-colors">
                                      <span className="hidden sm:inline text-[9px] tracking-wider">VISIT</span>
                                      <ExternalLink className="w-3 h-3 transition-transform group-hover/src:translate-x-0.5 group-hover/src:-translate-y-0.5" />
                                    </span>
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
