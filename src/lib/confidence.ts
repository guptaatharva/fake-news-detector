// src/lib/confidence.ts

// Deterministic Confidence Engine
// Final Confidence = 35% Source Quality + 25% Evidence Strength + 25% Agent Agreement + 15% Freshness
//
// This replaces the LLM's free-text, self-reported confidence with a formula computed
// from real signals gathered during the pipeline (domain credibility scores, whether the
// evidence actually backs the reached verdict, how much the debate agents agreed, and how
// recent the corroborating evidence is). It is deterministic and auditable: the same inputs
// always produce the same score, and every component of `scoreBreakdown` can be traced back
// to a concrete number rather than model prose.

export interface ConfidenceFactors {
  averageSourceReliability: number; // 0 to 100
  evidenceStrengthRatio: number; // 0 to 1 (e.g. 0.8 if 8 out of 10 support)
  multiAgentAgreement: number; // 0 to 1
  recencyScore: number; // 0 to 100
}

export interface ConfidenceBreakdown {
  sourceQuality: number;
  evidenceStrength: number;
  agentAgreement: number;
  freshness: number;
  totalConfidence: number;
}

const WEIGHT_SOURCE = 35;
const WEIGHT_EVIDENCE = 25;
const WEIGHT_AGENT = 25;
const WEIGHT_RECENCY = 15;

export function calculateDeterministicConfidence(factors: ConfidenceFactors): ConfidenceBreakdown {
  const sourceScore = (clamp01(factors.averageSourceReliability / 100)) * WEIGHT_SOURCE;
  const evidenceScore = clamp01(factors.evidenceStrengthRatio) * WEIGHT_EVIDENCE;
  const agentScore = clamp01(factors.multiAgentAgreement) * WEIGHT_AGENT;
  const recencyScore = clamp01(factors.recencyScore / 100) * WEIGHT_RECENCY;

  const total = sourceScore + evidenceScore + agentScore + recencyScore;

  return {
    sourceQuality: Math.round(sourceScore),
    evidenceStrength: Math.round(evidenceScore),
    agentAgreement: Math.round(agentScore),
    freshness: Math.round(recencyScore),
    totalConfidence: Math.round(total),
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Averages several per-claim breakdowns into a single overall-document breakdown. */
export function aggregateConfidenceFactors(all: ConfidenceFactors[]): ConfidenceFactors {
  if (all.length === 0) {
    return { averageSourceReliability: 0, evidenceStrengthRatio: 0, multiAgentAgreement: 0, recencyScore: 0 };
  }
  const sum = all.reduce(
    (acc, f) => ({
      averageSourceReliability: acc.averageSourceReliability + f.averageSourceReliability,
      evidenceStrengthRatio: acc.evidenceStrengthRatio + f.evidenceStrengthRatio,
      multiAgentAgreement: acc.multiAgentAgreement + f.multiAgentAgreement,
      recencyScore: acc.recencyScore + f.recencyScore,
    }),
    { averageSourceReliability: 0, evidenceStrengthRatio: 0, multiAgentAgreement: 0, recencyScore: 0 },
  );
  return {
    averageSourceReliability: sum.averageSourceReliability / all.length,
    evidenceStrengthRatio: sum.evidenceStrengthRatio / all.length,
    multiAgentAgreement: sum.multiAgentAgreement / all.length,
    recencyScore: sum.recencyScore / all.length,
  };
}

/**
 * Converts a publish date into a 0-100 freshness score. Undated evidence gets a
 * neutral middle score rather than being penalized as if it were stale.
 */
export function computeRecencyScore(publishedAt?: string | null): number {
  if (!publishedAt) return 50;
  const parsed = new Date(publishedAt);
  if (isNaN(parsed.getTime())) return 50;

  const ageDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 0) return 50; // future-dated / clock skew — don't reward or punish
  if (ageDays <= 7) return 100;
  if (ageDays <= 30) return 85;
  if (ageDays <= 180) return 65;
  if (ageDays <= 365) return 45;
  return 25;
}

/** Produces a short, human-readable explanation string from a breakdown, for display/back-compat. */
export function describeConfidenceBreakdown(b: ConfidenceBreakdown): string {
  return (
    `Computed deterministically: source quality contributed ${b.sourceQuality}/35, ` +
    `evidence strength ${b.evidenceStrength}/25, multi-agent agreement ${b.agentAgreement}/25, ` +
    `and evidence freshness ${b.freshness}/15 — for a total confidence of ${b.totalConfidence}/100.`
  );
}

const VERDICT_SCORE_MAP: Record<string, number | null> = {
  TRUE: 100,
  MOSTLY_TRUE: 75,
  MIXTURE: 50,
  MOSTLY_FALSE: 25,
  FALSE: 0,
  UNVERIFIABLE: null,
  SATIRE: null,
};

const SCORE_VERDICT_BANDS: Array<{ min: number; verdict: string }> = [
  { min: 87.5, verdict: 'TRUE' },
  { min: 62.5, verdict: 'MOSTLY_TRUE' },
  { min: 37.5, verdict: 'MIXTURE' },
  { min: 12.5, verdict: 'MOSTLY_FALSE' },
  { min: -Infinity, verdict: 'FALSE' },
];

/**
 * Aggregates individual claim verdicts into one overall document verdict, weighted
 * by each claim's own computed confidence so a single low-confidence claim can't
 * dominate the overall assessment.
 */
export function aggregateVerdict(
  claims: Array<{ verdict: string; confidence: number }>,
): { verdict: string; verifiableCount: number } {
  const weighted = claims
    .map((c) => ({ score: VERDICT_SCORE_MAP[c.verdict], weight: Math.max(1, c.confidence) }))
    .filter((c): c is { score: number; weight: number } => c.score !== null && c.score !== undefined);

  if (weighted.length === 0) {
    return { verdict: 'UNVERIFIABLE', verifiableCount: 0 };
  }

  const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
  const weightedAvg = weighted.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;

  const band = SCORE_VERDICT_BANDS.find((b) => weightedAvg >= b.min) || SCORE_VERDICT_BANDS[SCORE_VERDICT_BANDS.length - 1];
  return { verdict: band.verdict, verifiableCount: weighted.length };
}
