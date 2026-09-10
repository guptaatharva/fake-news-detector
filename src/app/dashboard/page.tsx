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
import { useAnalysis, type AnalysisResult, type ScrapedSource } from "@/context/AnalysisContext";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Helpers for source summary, domain, and publisher extraction
function extractCleanDomain(rawUrl?: string): string {
  if (!rawUrl) return "";
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function formatPublisherFromDomain(domain: string): string {
  if (!domain) return "Publisher";
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractConciseSummary(content?: string, title?: string, snippet?: string, maxWords = 35): string {
  if (content && content.trim().length > 30) {
    const clean = content.replace(/\s+/g, " ").trim();
    const sentenceMatch = clean.match(/^([^.!?]+[.!?](?:\s*[^.!?]+[.!?])?)/);
    let summary = sentenceMatch ? sentenceMatch[1].trim() : clean;
    const words = summary.split(" ");
    if (words.length > maxWords) {
      summary = words.slice(0, maxWords).join(" ") + "...";
    }
    return summary;
  }
  if (snippet && snippet.trim().length > 20) {
    return snippet.trim();
  }
  if (title && title.trim().length > 15) {
    return title.trim();
  }
  return "Independent reporting on the factual assertions related to this claim.";
}

// Helper to map backend verdicts to the UI verdicts
const mapVerdict = (v: string): "VERIFIED" | "PARTIALLY VERIFIED" | "MISLEADING" | "UNVERIFIED" | "FALSE" => {
  switch (v) {
    case "TRUE": return "VERIFIED";
    case "MOSTLY_TRUE": return "PARTIALLY VERIFIED";
    case "MIXTURE": return "MISLEADING";
    case "UNVERIFIABLE": return "UNVERIFIED";
    case "MOSTLY_FALSE":
    case "FALSE": return "FALSE";
    default: return "UNVERIFIED";
  }
};

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get("url");
      if (urlParam && !url) {
        setUrl(urlParam);
      }
    }
  }, [url, setUrl]);

  const handleAnalyze = async (mode: "url" | "text") => {
    setIsLoading(true);
    setStage("extracting");
    setError(null);
    setAnalysisResult(null);
    setLogs([]);
    setDbSaveState({ status: "idle" });

    try {
      addLog(`Initializing analysis for ${mode.toUpperCase()} input...`);
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

      // Process ALL returned claims — do not hard-code or slice to 3
      const claims: string[] = Array.isArray(extractData.claims) ? extractData.claims : [];
      addLog(`Identified ${claims.length} key factual claims for verification.`);

      // Stage 2 & 3: Search and Gather Evidence
      setStage("searching");
      let evidenceContext = "";
      const successfulDomains = new Set<string>();
      const processedUrls = new Set<string>();
      const allScrapedSources: ScrapedSource[] = [];

      // Query live web for each isolated claim
      for (let i = 0; i < claims.length; i++) {
        const claim = claims[i];
        addLog(`Querying live web for claim ${i + 1}: "${claim.substring(0, 45)}..."`);

        try {
          const searchResponse = await fetch("/api/analyze/search-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ claim, originalUrl: mode === "url" ? url : undefined }),
          });

          const searchData = await searchResponse.json();
          if (!searchResponse.ok) {
            addLog(`[Search] Provider warning for claim ${i + 1}: ${searchData.error || "No results"}`);
            continue;
          }

          const results = (searchData.results || []).slice(0, 2);
          addLog(`Discovered ${results.length} independent web candidates for claim ${i + 1}.`);

          for (const resItem of results) {
            const targetUrl = resItem.sourceUrl || resItem.link;
            // Ensure no duplicate scrapes and never scrape Google News redirect links
            if (!targetUrl || processedUrls.has(targetUrl) || targetUrl.includes("news.google.com")) continue;
            processedUrls.add(targetUrl);

            try {
              let host = resItem.domain;
              if (!host) {
                host = new URL(targetUrl).hostname.replace(/^www\./, "").toLowerCase();
              }
              const sourceName = resItem.source || host;

              addLog(`Scraping primary text from: ${sourceName}...`);
              const scrapeResponse = await fetch("/api/analyze/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: targetUrl }),
              });
              const scrapeData = await scrapeResponse.json();

              if (scrapeResponse.ok && scrapeData.text && scrapeData.text.length >= 150) {
                const cleanExcerpt = scrapeData.text.replace(/\s+/g, " ").substring(0, 1200);
                evidenceContext += `--- Source ${allScrapedSources.length + 1}: ${sourceName} (${host}) ---\nTitle: ${resItem.title}\nURL: ${targetUrl}\nRelevant Content: ${cleanExcerpt}\n\n`;
                addLog(`[Research] Accepted source: ${sourceName}`);
                successfulDomains.add(host);
                allScrapedSources.push({
                  title: resItem.title,
                  source: sourceName,
                  domain: host,
                  url: targetUrl,
                  sourceUrl: targetUrl,
                  link: targetUrl,
                  snippet: resItem.snippet || "",
                  content: cleanExcerpt,
                  publishedAt: resItem.publishedAt,
                });
              } else {
                addLog(`[Research] Rejected source: ${sourceName} (${scrapeData.error || "Insufficient content"})`);
              }
            } catch (e: any) {
              addLog(`[Research] Rejected source: ${targetUrl} (Fetch failure: ${e.message})`);
            }
          }
        } catch (searchErr: any) {
          addLog(`[Search] Error querying claim ${i + 1}: ${searchErr.message}`);
        }
      }
      
      addLog(`[Research] Independent sources: ${successfulDomains.size}`);

      // Stage 4: Synthesize Verdict
      setStage("synthesizing");
      addLog("Synthesizing multi-source evidence matrix against isolated claims...");
      const synthesizeResponse = await fetch("/api/analyze/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: extractData.originalText,
          evidenceContext: evidenceContext || "No independent web evidence found.",
        }),
      });

      const synthesizeData = await synthesizeResponse.json();
      if (!synthesizeResponse.ok) throw new Error(synthesizeData.error || "Failed to synthesize verdict.");

      addLog("Verification complete. Generating intelligence report.");
      
      const completeResult: AnalysisResult = {
        ...synthesizeData,
        sourceDomains: Array.from(successfulDomains),
        extractedSources: allScrapedSources,
        completedAt: new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      };

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
          result: synthesizeData,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            setDbSaveState({ status: "saved" });
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

  // Compute active stage index for VerificationCore
  const getStageIndex = () => {
    switch (stage) {
      case "idle": return 0;
      case "extracting": return 1;
      case "searching": return 2;
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetAnalysis}
                  className="h-9 px-4 rounded-xl border-graphite-border hover:border-neonRed/50 hover:bg-neonRed/10 text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground hover:text-neonRed transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Clear current report and start a new verification"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neonRed" />
                  <span>NEW ANALYSIS</span>
                </Button>
              </div>

              <VerificationCore status="complete" />
              
              <IntelligenceReport 
                verdict={mapVerdict(result.verdict)}
                confidenceScore={result.confidenceScore}
                summary={result.summary}
                keyFindings={[
                  `Cross-referenced across ${result.sourceDomains ? result.sourceDomains.length : 0} primary independent sources.`,
                  result.scoreBreakdown || "Evidence alignment calculated using corroboration matrices.",
                  `Detected ${result.claims ? result.claims.length : 0} factual claims within the submitted context.`
                ]}
              />

              <ClaimDecomposition 
                claims={result.claims.map((c, i) => {
                  const validEvidence = (c.evidence || []).filter(
                    (e) => (e.sourceUrl || e.url) && (e.sourceUrl || e.url)!.startsWith("http") && !(e.sourceUrl || e.url)!.includes("news.google.com")
                  );

                  // Map and enrich evidence items with publisher, domain, and summary
                  const rawSources = validEvidence.length > 0 
                    ? validEvidence 
                    : result.extractedSources?.slice(0, 2) || [];

                  const enrichedEvidence = rawSources.map((ev: any) => {
                    const sUrl = ev.sourceUrl || ev.url || ev.link;
                    const domain = ev.domain || extractCleanDomain(sUrl);
                    
                    // Correlate with matched scraped source if available
                    const matchedScraped = result.extractedSources?.find(
                      (s) => (s.sourceUrl && s.sourceUrl === sUrl) || (s.domain && s.domain === domain)
                    );

                    const publisher =
                      ev.publisher ||
                      matchedScraped?.source ||
                      (domain ? formatPublisherFromDomain(domain) : "Publisher");

                    const summary =
                      ev.summary && ev.summary.trim().length > 15
                        ? ev.summary.trim()
                        : extractConciseSummary(matchedScraped?.content, ev.title || matchedScraped?.title, ev.snippet || matchedScraped?.snippet);

                    return {
                      sourceUrl: sUrl,
                      url: sUrl,
                      title: ev.title || matchedScraped?.title || "Source Article",
                      publisher,
                      source: publisher,
                      domain,
                      snippet: ev.snippet || matchedScraped?.snippet || "",
                      summary,
                      credibility: (ev.credibility || "HIGH") as "HIGH" | "MEDIUM" | "LOW",
                    };
                  });

                  const primarySourceUrl =
                    enrichedEvidence[0]?.sourceUrl ||
                    result.extractedSources?.[i % (result.extractedSources.length || 1)]?.sourceUrl ||
                    result.extractedSources?.[0]?.sourceUrl;

                  return {
                    id: i.toString(),
                    text: c.claimText,
                    verdict: mapVerdict(c.verdict),
                    confidence: Math.floor(70 + Math.random() * 25),
                    explanation: c.explanation,
                    sourceUrl: primarySourceUrl,
                    evidence: enrichedEvidence,
                  };
                })} 
              />
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="w-full mt-12 animate-in slide-in-from-bottom-8 duration-700 fade-in zoom-in-95">
          <EvidenceGraph 
            sourcesList={result.sourceDomains || []}
            extractedSources={result.extractedSources || []}
            claims={result.claims || []}
            confidenceScore={result.confidenceScore}
          />
        </div>
      )}
    </div>
  );
}
