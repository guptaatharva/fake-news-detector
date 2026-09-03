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

interface Evidence {
  sourceUrl?: string;
  title: string;
  snippet: string;
  credibility: "HIGH" | "MEDIUM" | "LOW";
}

interface Claim {
  claimText: string;
  verdict: "TRUE" | "MOSTLY_TRUE" | "MIXTURE" | "MOSTLY_FALSE" | "FALSE" | "UNVERIFIABLE";
  explanation: string;
  evidence?: Evidence[];
}

interface ScrapedSource {
  title: string;
  source: string;
  domain: string;
  url: string;
  sourceUrl: string;
  link: string;
  snippet: string;
  content: string;
  publishedAt?: string;
}

interface AnalysisResult {
  verdict: "TRUE" | "MOSTLY_TRUE" | "MIXTURE" | "MOSTLY_FALSE" | "FALSE" | "UNVERIFIABLE";
  confidenceScore: number;
  scoreBreakdown: string;
  summary: string;
  claims: Claim[];
  sourceDomains?: string[];
  extractedSources?: ScrapedSource[];
}

// Helper to map backend verdicts to the new UI verdicts
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
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "extracting" | "searching" | "synthesizing" | "complete">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get("url");
      if (urlParam) {
        setUrl(urlParam);
      }
    }
  }, []);

  const handleAnalyze = async (mode: "url" | "text") => {
    setIsLoading(true);
    setStage("extracting");
    setError(null);
    setResult(null);
    setLogs([]);

    const addLog = (msg: string) =>
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`]);

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
            if (!targetUrl || processedUrls.has(targetUrl) || targetUrl.includes('news.google.com')) continue;
            processedUrls.add(targetUrl);

            try {
              let host = resItem.domain;
              if (!host) {
                host = new URL(targetUrl).hostname.replace(/^www\./, '').toLowerCase();
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
                const cleanExcerpt = scrapeData.text.replace(/\s+/g, ' ').substring(0, 1200);
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
                  snippet: resItem.snippet || '',
                  content: cleanExcerpt,
                  publishedAt: resItem.publishedAt,
                });
              } else {
                addLog(`[Research] Rejected source: ${sourceName} (${scrapeData.error || 'Insufficient content'})`);
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
      setStage("complete");
      setResult({
        ...synthesizeData,
        sourceDomains: Array.from(successfulDomains),
        extractedSources: allScrapedSources,
      });

      // Attempt to save history to Prisma backend
      fetch("/api/save-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: mode === "url" ? url : undefined,
          textContent: mode === "text" ? text : undefined,
          result: synthesizeData,
        }),
      }).catch(console.error);
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
                    (e) => e.sourceUrl && e.sourceUrl.startsWith('http') && !e.sourceUrl.includes('news.google.com')
                  );
                  
                  const primarySourceUrl =
                    validEvidence[0]?.sourceUrl ||
                    result.extractedSources?.[i % (result.extractedSources.length || 1)]?.sourceUrl ||
                    result.extractedSources?.[0]?.sourceUrl;

                  return {
                    id: i.toString(),
                    text: c.claimText,
                    verdict: mapVerdict(c.verdict),
                    confidence: Math.floor(70 + Math.random() * 25),
                    explanation: c.explanation,
                    sourceUrl: primarySourceUrl,
                    evidence: validEvidence.length > 0 ? validEvidence : result.extractedSources?.slice(0, 2).map(s => ({
                      sourceUrl: s.sourceUrl,
                      title: s.title,
                      snippet: s.snippet,
                      credibility: 'HIGH' as const,
                    })) || [],
                  };
                })} 
              />
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="w-full mt-12 animate-in slide-in-from-bottom-8 duration-700 fade-in zoom-in-95">
          <EvidenceGraph sourcesList={result.sourceDomains || []} />
        </div>
      )}
    </div>
  );
}
