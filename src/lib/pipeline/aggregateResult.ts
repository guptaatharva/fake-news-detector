// src/lib/pipeline/aggregateResult.ts
//
// Pure aggregation step of the analysis pipeline: turns the per-claim debate
// outcomes and the sources scraped for them into the single `AnalysisResult`
// shown in the dashboard and persisted by /api/save-analysis. Extracted out
// of src/app/dashboard/page.tsx so it has one implementation that both the
// live UI and the golden-set pipeline test (src/test/golden/pipeline.e2e.test.ts)
// exercise — a regression here fails the test without needing to duplicate
// the aggregation logic in the test itself.
import type { AnalysisResult, Claim, ScrapedSource } from "@/context/AnalysisContext";
import {
  aggregateVerdict,
  aggregateConfidenceFactors,
  calculateDeterministicConfidence,
  describeConfidenceBreakdown,
  type ConfidenceFactors,
} from "@/lib/confidence";
import { hasLowPublisherDiversity } from "@/lib/mediaOwnership";

interface ClaimWithFactors extends Claim {
  confidenceFactors?: ConfidenceFactors;
}

export function aggregateResult(
  claims: ClaimWithFactors[],
  allScrapedSources: ScrapedSource[],
): AnalysisResult {
  const successfulDomains = new Set(allScrapedSources.map((s) => s.domain).filter(Boolean));

  const { verdict: overallVerdict } = aggregateVerdict(
    claims.map((c) => ({ verdict: c.verdict, confidence: c.confidence || 0 })),
  );

  const factorsList = claims.map((c) => c.confidenceFactors).filter((f): f is ConfidenceFactors => Boolean(f));
  const overallFactors = aggregateConfidenceFactors(factorsList);
  const overallBreakdown = calculateDeterministicConfidence(overallFactors);

  const lowSourceDiversity = hasLowPublisherDiversity(allScrapedSources.map((s) => s.domain).filter(Boolean));
  if (lowSourceDiversity && overallBreakdown.totalConfidence > 55) {
    overallBreakdown.totalConfidence = 55;
  }

  const verdictCounts: Record<string, number> = {};
  for (const c of claims) verdictCounts[c.verdict] = (verdictCounts[c.verdict] || 0) + 1;
  const verdictSummary = Object.entries(verdictCounts)
    .map(([v, count]) => `${count} ${v.replace(/_/g, " ").toLowerCase()}`)
    .join(", ");

  const mostNotable = claims.find((c) => ["FALSE", "MOSTLY_FALSE"].includes(c.verdict)) || claims[0];

  const summary = claims.length
    ? `Analyzed ${claims.length} factual claim${claims.length === 1 ? "" : "s"} against ${successfulDomains.size} independent source${successfulDomains.size === 1 ? "" : "s"}: ${verdictSummary}. ${mostNotable?.explanation || ""}`.trim()
    : "No verifiable factual claims were found in the submitted content.";

  return {
    verdict: overallVerdict as AnalysisResult["verdict"],
    confidenceScore: overallBreakdown.totalConfidence,
    confidenceBreakdown: overallBreakdown,
    scoreBreakdown: describeConfidenceBreakdown(overallBreakdown),
    summary,
    claims,
    sourceDomains: Array.from(successfulDomains),
    extractedSources: allScrapedSources,
    lowSourceDiversity,
    completedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  };
}
