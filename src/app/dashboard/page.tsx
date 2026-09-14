"use client";

import { useState, useEffect } from "react";
import DashboardHero from "./DashboardHero";
import VerifyCard from "./VerifyCard";
import ReadyPanel from "./ReadyPanel";
import AgentTerminal from "./AgentTerminal";
import VerificationCore from "@/components/dashboard/VerificationCore";
import EvidenceGraph from "@/components/dashboard/EvidenceGraph";
import IntelligenceReport from "@/components/dashboard/IntelligenceReport";
import ClaimDecomposition from "@/components/dashboard/ClaimDecomposition";
import { useAnalysis, type AnalysisResult, type ScrapedSource, type Claim as ContextClaim } from "@/context/AnalysisContext";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapWithConcurrency } from "@/lib/concurrency";
import { aggregateConfidenceFactors, calculateDeterministicConfidence, type ConfidenceFactors } from "@/lib/confidence";
import { aggregateResult } from "@/lib/pipeline/aggregateResult";

const CLAIM_CONCURRENCY = 4;
const SOURCES_PER_CLAIM = 3;

// Helper to map backend verdicts to the UI verdicts
const mapVerdict = (v: string): "VERIFIED" | "PARTIALLY VERIFIED" | "MISLEADING" | "UNVERIFIED" | "FALSE" | "SATIRE" => {
  switch (v) {
    case "TRUE": return "VERIFIED";
    case "MOSTLY_TRUE": return "PARTIALLY VERIFIED";
    case "MIXTURE": return "MISLEADING";
    case "UNVERIFIABLE": return "UNVERIFIED";
    case "MOSTLY_FALSE":
    case "FALSE": return "FALSE";
    case "SATIRE": return "SATIRE";
    default: return "UNVERIFIED";
  }
};

interface ClaimWithFactors extends ContextClaim {
  confidenceFactors?: ConfidenceFactors;
}

/** Response shape of GET /api/analyze/cached (§REMAINING.md #9 — cross-user result caching). */
interface CachedMatch {
  id: string;
  createdAt: string;
  isOwn: boolean;
  isPublic: boolean;
  publicSlug: string | null;
  result: AnalysisResult;
}

export default function DashboardPage() {
  const {
    result,
    url,
    text,
    stage,
    logs,
    error,
    dbSaveState,
    setUrl,
    setText,
    setStage,
    setLogs,
    addLog,
    setError,
    setAnalysisResult,
    setDbSaveState,
    resetAnalysis,
  } = useAnalysis();

  const [isLoading, setIsLoading] = useState(false);
  const [previousVersionId, setPreviousVersionId] = useState<string | null>(null);
  const [recheckNotice, setRecheckNotice] = useState<string | null>(null);
  const [cachedMatch, setCachedMatch] = useState<CachedMatch | null>(null);
  const [isCheckingCache, setIsCheckingCache] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get("url");
      if (urlParam && !url) {
        setUrl(urlParam);
      }

      // Re-check flow (§6.4): /dashboard?recheckId=<analysisId> prefills the
      // original submission and chains the new run to it via previousVersionId.
      const recheckId = params.get("recheckId");
      if (recheckId) {
        fetch(`/api/analyses/${recheckId}`)
          .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Could not load that analysis."))))
          .then((data) => {
            setPreviousVersionId(recheckId);
            if (data.sourceUrl) {
              setUrl(data.sourceUrl);
              setRecheckNotice(`Re-checking a previous analysis of this URL from ${new Date(data.createdAt).toLocaleDateString()}. Click "VERIFY" to run it again.`);
            } else if (data.textContent) {
              setText(data.textContent);
              setRecheckNotice(`Re-checking a previous text analysis from ${new Date(data.createdAt).toLocaleDateString()} — switch to the "Paste Text" tab to see it prefilled, then click "VERIFY".`);
            }
          })
          .catch(() => setRecheckNotice(null));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Independently gathers evidence for ONE claim, then runs it through the
   * multi-agent debate system (Support / Opposition / Context / Temporal /
   * Judge — see src/lib/agents/debateOrchestrator.ts), which is now the core
   * verification engine rather than an opt-in mode. Every claim gets its own
   * isolated evidence set so one claim's sources can't leak into another's
   * verdict.
   */
  async function processClaim(
    claimText: string,
    index: number,
    mode: "url" | "text",
    originalUrl: string,
  ): Promise<{ claim: ClaimWithFactors; scrapedSources: ScrapedSource[] }> {
    const scrapedSources: ScrapedSource[] = [];

    try {
      addLog(`Querying live web for claim ${index + 1}: "${claimText.substring(0, 45)}..."`);

      const searchResponse = await fetch("/api/analyze/search-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: claimText, originalUrl: mode === "url" ? originalUrl : undefined }),
      });
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) {
        addLog(`[Search] Provider warning for claim ${index + 1}: ${searchData.error || "No results"}`);
      }

      const candidates = (searchData.results || []).slice(0, SOURCES_PER_CLAIM);
      addLog(`Discovered ${candidates.length} independent web candidates for claim ${index + 1}.`);

      const scrapeResults = await mapWithConcurrency(candidates, SOURCES_PER_CLAIM, async (resItem: any) => {
        const targetUrl = resItem.sourceUrl || resItem.link;
        if (!targetUrl || targetUrl.includes("news.google.com")) return null;

        try {
          let host = resItem.domain;
          if (!host) host = new URL(targetUrl).hostname.replace(/^www\./, "").toLowerCase();
          const sourceName = resItem.source || host;

          addLog(`Scraping primary text from: ${sourceName}...`);
          const scrapeResponse = await fetch("/api/analyze/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl }),
          });
          const scrapeData = await scrapeResponse.json();

          if (scrapeResponse.ok && scrapeData.text && scrapeData.text.length >= 150) {
            const cleanExcerpt = scrapeData.text.replace(/\s+/g, " ").substring(0, 1500);
            addLog(`[Research] Accepted source: ${sourceName}`);
            if (scrapeData.injectionSuspected) {
              addLog(`[Security] Possible manipulation attempt detected in content from ${sourceName} — flagged, not trusted as instructions.`);
            }
            const scraped: ScrapedSource = {
              title: resItem.title,
              source: sourceName,
              domain: host,
              url: targetUrl,
              sourceUrl: targetUrl,
              link: targetUrl,
              snippet: resItem.snippet || "",
              content: cleanExcerpt,
              publishedAt: scrapeData.publishedAt || resItem.publishedAt,
              byline: scrapeData.byline || undefined,
              injectionSuspected: Boolean(scrapeData.injectionSuspected),
            };
            return scraped;
          }
          addLog(`[Research] Rejected source: ${sourceName} (${scrapeData.error || "Insufficient content"})`);
          return null;
        } catch (e: any) {
          addLog(`[Research] Rejected source: ${targetUrl} (Fetch failure: ${e.message})`);
          return null;
        }
      });

      for (const s of scrapeResults) {
        if (s) scrapedSources.push(s);
      }

      // Skip the 5-agent debate call entirely when no evidence was found —
      // it's five extra LLM round-trips to reach the same UNVERIFIABLE
      // outcome the confidence formula already produces deterministically
      // for zero evidence (averageSourceReliability=20, evidenceStrength=0,
      // recency=50 baseline → 15% confidence, matching what the full debate
      // route computes for this exact case). This is the single biggest
      // latency win available without changing what the pipeline concludes.
      if (scrapedSources.length === 0) {
        addLog(`[Debate] Claim ${index + 1}: no independent evidence found — skipping debate, marking UNVERIFIABLE.`);
        const factors: ConfidenceFactors = { averageSourceReliability: 20, evidenceStrengthRatio: 0, multiAgentAgreement: 0, recencyScore: 50 };
        const breakdown = calculateDeterministicConfidence(factors);
        return {
          claim: {
            claimText,
            verdict: "UNVERIFIABLE",
            explanation: "No independent web evidence could be found for this claim.",
            evidence: [],
            confidence: breakdown.totalConfidence,
            confidenceBreakdown: breakdown,
            confidenceFactors: factors,
            failed: true,
            failureReason: "No independent evidence found.",
          },
          scrapedSources: [],
        };
      }

      // --- Multi-agent debate for this claim, against only its own evidence ---
      const debateResponse = await fetch("/api/analyze/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: claimText,
          evidence: scrapedSources.map((s) => ({
            sourceUrl: s.sourceUrl,
            domain: s.domain,
            title: s.title,
            snippet: s.snippet,
            content: s.content,
            publisher: s.source,
            publishedAt: s.publishedAt,
            hasAuthor: Boolean(s.byline),
          })),
        }),
      });
      const debateData = await debateResponse.json();
      if (!debateResponse.ok) throw new Error(debateData.error || "Debate agents failed to reach a verdict.");

      if (debateData.isSatire) {
        addLog(`[Debate] Claim ${index + 1} originates from a known satire source — labeled SATIRE, not scored as misinformation.`);
      }
      if (debateData.lowSourceDiversity) {
        addLog(`[Debate] Claim ${index + 1}: fewer than 2 independent domains corroborated this verdict — confidence capped.`);
      }
      addLog(`[Debate] Claim ${index + 1} verdict: ${debateData.verdict} (${debateData.confidence}% confidence, agent agreement ${(debateData.agentAgreementScore * 100).toFixed(0)}%)`);

      const claim: ClaimWithFactors = {
        claimText: debateData.claimText,
        verdict: debateData.verdict,
        explanation: debateData.explanation,
        evidence: debateData.evidence,
        confidence: debateData.confidence,
        confidenceBreakdown: debateData.confidenceBreakdown,
        confidenceFactors: debateData.confidenceFactors,
        temporalStatus: debateData.temporalStatus,
        temporalAnalysis: debateData.temporalAnalysis,
        agentAgreementScore: debateData.agentAgreementScore,
        contextualFactors: debateData.contextualFactors,
        injectionAttemptDetected: debateData.injectionAttemptDetected,
        lowSourceDiversity: debateData.lowSourceDiversity,
        isSatire: debateData.isSatire,
      };

      return { claim, scrapedSources };
    } catch (err: any) {
      addLog(`[Debate] Claim ${index + 1} failed: ${err.message}`);
      return {
        claim: {
          claimText,
          verdict: "UNVERIFIABLE",
          explanation: "This claim could not be verified — the search, scrape, or debate step failed. Use retry to try again.",
          evidence: [],
          confidence: 0,
          failed: true,
          failureReason: err.message,
        },
        scrapedSources: [],
      };
    }
  }

  /**
   * Entry point wired to the VERIFY buttons. For URL mode, checks whether
   * someone (the same user, or another user who made their report public)
   * already verified this exact URL recently before spending a full
   * multi-agent pipeline run on it again (§REMAINING.md #9). Pass
   * `skipCache: true` to bypass the check and always run a fresh analysis.
   */
  const handleAnalyze = async (mode: "url" | "text", options: { skipCache?: boolean } = {}) => {
    setCachedMatch(null);

    if (mode === "url" && url.trim() && !options.skipCache) {
      setIsCheckingCache(true);
      try {
        const res = await fetch(`/api/analyze/cached?url=${encodeURIComponent(url.trim())}`);
        const data = await res.json().catch(() => ({ match: null }));
        if (data.match) {
          setCachedMatch(data.match);
          setIsCheckingCache(false);
          return;
        }
      } catch {
        // Cache lookup is best-effort — fall through to a fresh analysis.
      }
      setIsCheckingCache(false);
    }

    await runPipeline(mode);
  };

  /** Loads a cached match straight into the results panel without re-running the pipeline. */
  const applyCachedResult = (match: CachedMatch) => {
    setAnalysisResult(match.result);
    setStage("complete");
    setError(null);
    setRecheckNotice(null);
    // Only offer "RE-CHECK NOW" (which chains via previousVersionId) for the
    // caller's own saved analysis — never for another user's public one.
    setDbSaveState(match.isOwn ? { status: "saved", analysisId: match.id } : { status: "idle" });
    setCachedMatch(null);
  };

  const runPipeline = async (mode: "url" | "text") => {
    setIsLoading(true);
    setStage("extracting");
    setError(null);
    setAnalysisResult(null);
    setLogs([]);
    setDbSaveState({ status: "idle" });
    setRecheckNotice(null);

    try {
      addLog(`Initializing analysis for ${mode.toUpperCase()} input...`);
      if (previousVersionId) {
        addLog(`This run will be linked as a re-check of a previous analysis (${previousVersionId}).`);
      }
      const payload = mode === "url" ? { url } : { text };

      // Stage 1: Extract Claims (Target 10-15 atomic claims)
      addLog("Extracting verifiable factual assertions from source...");
      const extractResponse = await fetch("/api/analyze/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const extractData = await extractResponse.json();
      if (!extractResponse.ok) throw new Error(extractData.error || "Failed to extract claims from input.");

      const claims: string[] = Array.isArray(extractData.claims) ? extractData.claims : [];
      addLog(`Identified ${claims.length} key factual claims for verification.`);

      // Stage 2: Gather evidence + run the multi-agent debate, per claim, concurrently.
      setStage("searching");
      addLog(`Dispatching ${Math.min(CLAIM_CONCURRENCY, claims.length)} parallel research workers...`);
      setStage("debating");

      const perClaimResults = await mapWithConcurrency(claims, CLAIM_CONCURRENCY, (claim, i) =>
        processClaim(claim, i, mode, url),
      );

      const processedClaims = perClaimResults.map((r) => r.claim);
      const allScrapedSources = perClaimResults.flatMap((r) => r.scrapedSources);

      addLog(`[Research] Independent sources: ${new Set(allScrapedSources.map((s) => s.domain)).size}`);
      addLog("Verification complete. Generating intelligence report.");

      const completeResult = aggregateResult(processedClaims, allScrapedSources);

      // 1. Immediately store in global memory state
      setAnalysisResult(completeResult);
      setStage("complete");

      // 2. Separately attempt to persist to database in background (does NOT block or reset transient UI)
      setDbSaveState({ status: "saving" });
      fetch("/api/save-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: mode === "url" ? url : undefined,
          textContent: mode === "text" ? text : undefined,
          previousVersionId: previousVersionId || undefined,
          result: {
            ...completeResult,
            confidenceScore: completeResult.confidenceScore,
            confidenceFactors: aggregateConfidenceFactors(
              processedClaims.map((c) => c.confidenceFactors).filter((f): f is ConfidenceFactors => Boolean(f)),
            ),
            claims: processedClaims,
          },
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const saved = await res.json().catch(() => ({}));
            setDbSaveState({ status: "saved", analysisId: saved?.id });
            setPreviousVersionId(null);
          } else {
            const errJson = await res.json().catch(() => ({}));
            setDbSaveState({
              status: "error",
              message: errJson.error || "Could not save to account history.",
            });
          }
        })
        .catch((saveErr) => {
          console.warn("[Dashboard] Background database save error:", saveErr);
          setDbSaveState({
            status: "error",
            message: "Database connection failed. Analysis remains available in session.",
          });
        });

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
      setStage("idle");
    } finally {
      setIsLoading(false);
    }
  };

  /** Re-runs a single failed claim without re-running the whole pipeline (§8.7). */
  const retryClaim = async (claimIndex: number) => {
    if (!result) return;
    const target = result.claims[claimIndex];
    if (!target) return;

    addLog(`Retrying claim ${claimIndex + 1}...`);
    const { claim, scrapedSources } = await processClaim(target.claimText, claimIndex, url ? "url" : "text", url);

    const newClaims = [...result.claims];
    newClaims[claimIndex] = claim;
    const newSources = [...(result.extractedSources || []), ...scrapedSources];
    const recomputed = aggregateResult(newClaims as ClaimWithFactors[], newSources);
    setAnalysisResult(recomputed);
  };

  // Compute active stage index for VerificationCore
  const getStageIndex = () => {
    switch (stage) {
      case "idle": return 0;
      case "extracting": return 1;
      case "searching": return 2;
      case "debating": return 3;
      case "synthesizing": return 3;
      case "complete": return 4;
      default: return 0;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <DashboardHero />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Input Panel */}
        <div className="xl:col-span-5 space-y-6">
          <VerifyCard
            url={url}
            text={text}
            isLoading={isLoading}
            setUrl={setUrl}
            setText={setText}
            handleAnalyze={handleAnalyze}
          />

          {recheckNotice && (
            <div className="p-4 rounded-2xl border border-neonRed/30 bg-neonRed/10 text-xs font-mono text-foreground">
              <strong className="text-neonRed">RE-CHECK QUEUED:</strong> {recheckNotice}
            </div>
          )}

          {isCheckingCache && (
            <div className="p-4 rounded-2xl border border-graphite-border bg-graphite-surface text-xs font-mono text-muted-foreground">
              Checking whether this URL was already verified recently...
            </div>
          )}

          {cachedMatch && (
            <div className="p-4 rounded-2xl border border-neonRed/30 bg-neonRed/10 text-xs font-mono text-foreground space-y-3">
              <p>
                <strong className="text-neonRed">ALREADY VERIFIED:</strong>{" "}
                {cachedMatch.isOwn ? "You" : "Another user"} checked this URL{" "}
                {new Date(cachedMatch.createdAt).toLocaleString()} — verdict{" "}
                <strong>{cachedMatch.result.verdict}</strong> ({cachedMatch.result.confidenceScore}% confidence).
              </p>
              <p className="text-muted-foreground normal-case">{cachedMatch.result.summary}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyCachedResult(cachedMatch)}
                  className="h-8 px-3 rounded-lg bg-neonRed hover:bg-neonRed/90 text-white text-[11px] font-mono font-semibold uppercase tracking-wider"
                >
                  Use This Result
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCachedMatch(null);
                    handleAnalyze("url", { skipCache: true });
                  }}
                  className="h-8 px-3 rounded-xl border-graphite-border text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground hover:text-neonRed hover:border-neonRed/50"
                >
                  Run Fresh Check Anyway
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl border border-verificator-false/30 bg-verificator-false/10 text-verificator-false text-xs font-mono">
              <strong>ANALYSIS ERROR:</strong> {error}
            </div>
          )}

          {dbSaveState.status === "error" && (
            <div className="p-4 rounded-2xl border border-verificator-warning/30 bg-verificator-warning/10 text-verificator-warning text-xs font-mono flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-verificator-warning" />
              <div className="space-y-1">
                <p className="font-semibold uppercase tracking-wider">Session Memory Active</p>
                <p className="text-muted-foreground leading-relaxed">
                  Analysis generated successfully. We couldn't save it to your account history right now, but your report remains fully available during this session.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Results & Terminal Panel */}
        <div className="xl:col-span-7 space-y-6">
          {!result && !isLoading && !error && <ReadyPanel />}

          {isLoading && (
            <div className="space-y-6">
              <VerificationCore status="processing" activeStageIndex={getStageIndex()} />
              <AgentTerminal stage={stage} logs={logs} />
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Header Action Bar with NEW ANALYSIS button */}
              <div className="flex items-center justify-between pb-1 border-b border-graphite-border">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-neonRed animate-pulse" />
                  <span>COMPLETED INTELLIGENCE DOSSIER</span>
                </div>

                <div className="flex items-center gap-2">
                  {dbSaveState.analysisId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPreviousVersionId(dbSaveState.analysisId || null);
                        handleAnalyze(url ? "url" : "text", { skipCache: true });
                      }}
                      disabled={isLoading}
                      className="h-9 px-4 rounded-xl border-graphite-border hover:border-neonRed/50 hover:bg-neonRed/10 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground hover:text-neonRed transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                      title="Re-run this exact analysis now — news develops, a verdict from earlier may be outdated"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-neonRed" />
                      <span>RE-CHECK NOW</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetAnalysis();
                      setPreviousVersionId(null);
                      setRecheckNotice(null);
                    }}
                    className="h-9 px-4 rounded-xl border-graphite-border hover:border-neonRed/50 hover:bg-neonRed/10 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground hover:text-neonRed transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    title="Clear current report and start a new verification"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-neonRed" />
                    <span>NEW ANALYSIS</span>
                  </Button>
                </div>
              </div>

              <VerificationCore status="complete" />
            </div>
          )}
        </div>
      </div>

      {/* Full-width report section — the evidence graph is a spatial node
          diagram (radial layout, labeled source boxes) that needs real
          horizontal room to stay readable; squeezing it into a half-width
          column was making labels crowd and overlap. Rendering it (and the
          summary/claims below it) at the page's full width, right after the
          input section, keeps it directly below input while giving every
          piece of the report enough space to render properly. */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <EvidenceGraph
            sourcesList={result.sourceDomains || []}
            extractedSources={result.extractedSources || []}
            claims={result.claims || []}
            confidenceScore={result.confidenceScore}
          />

          <IntelligenceReport
            verdict={mapVerdict(result.verdict)}
            confidenceScore={result.confidenceScore}
            confidenceBreakdown={result.confidenceBreakdown}
            summary={result.summary}
            lowSourceDiversity={result.lowSourceDiversity}
            keyFindings={[
              `Cross-referenced across ${result.sourceDomains ? result.sourceDomains.length : 0} primary independent sources.`,
              `Detected ${result.claims ? result.claims.length : 0} factual claims within the submitted context.`,
            ]}
          />

          <ClaimDecomposition
            claims={result.claims.map((c, i) => ({
              id: i.toString(),
              text: c.claimText,
              verdict: mapVerdict(c.verdict),
              confidence: c.confidence ?? 0,
              explanation: c.explanation,
              temporalStatus: c.temporalStatus,
              isSatire: c.isSatire,
              failed: c.failed,
              injectionAttemptDetected: c.injectionAttemptDetected,
              lowSourceDiversity: c.lowSourceDiversity,
              evidence: (c.evidence || []).map((ev: any) => ({
                sourceUrl: ev.sourceUrl,
                url: ev.sourceUrl,
                title: ev.title,
                publisher: ev.publisher,
                domain: ev.domain,
                snippet: ev.snippet,
                summary: ev.summary,
                credibility: ev.credibility,
                stance: ev.stance,
                publishedAt: ev.publishedAt,
              })),
              onRetry: c.failed ? () => retryClaim(i) : undefined,
            }))}
          />
        </div>
      )}
    </div>
  );
}
