// src/lib/agents/debateOrchestrator.ts
//
// The multi-agent debate system is now the core verification engine for every
// claim (not an opt-in "deep verification" mode): each claim is independently
// argued by a Support agent, an Opposition agent, a Context agent, and a
// Temporal agent, then a Judge agent weighs their findings into a verdict and
// a per-source stance classification. Confidence is never the judge's own
// self-reported number — it is computed deterministically from the judge's
// agreement score, the credibility of the sources actually used, whether the
// evidence agrees with the reached verdict, and how fresh that evidence is.

import { runSupportAgent } from './supportAgent';
import { runOppositionAgent } from './oppositionAgent';
import { runContextAgent } from './contextAgent';
import { runTemporalAgent } from './temporalAgent';
import { runJudgeAgent, type JudgeSourceRef } from './judgeAgent';
import { evaluateDomainCredibility, type DomainCredibilityResult } from '../credibility';
import { calculateDeterministicConfidence, computeRecencyScore, type ConfidenceBreakdown, type ConfidenceFactors } from '../confidence';
import { isSatireDomain } from '../satire';
import { scanEvidenceForInjection } from '../promptSafety';

export interface DebateEvidenceInput {
  sourceUrl: string;
  domain: string;
  title: string;
  snippet: string;
  content: string;
  publisher?: string;
  publishedAt?: string;
  hasAuthor?: boolean;
}

export interface DebateClaimInput {
  claim: string;
  evidence: DebateEvidenceInput[];
}

export interface DebateEvidenceOutput {
  sourceUrl: string;
  domain: string;
  title: string;
  publisher: string;
  snippet: string;
  summary: string;
  publishedAt?: string;
  stance: 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL' | 'IRRELEVANT';
  credibility: 'HIGH' | 'MEDIUM' | 'LOW';
  credibilityScore: number;
  isSatire: boolean;
}

export interface DebateClaimResult {
  claimText: string;
  verdict: string;
  explanation: string;
  temporalStatus: string;
  temporalAnalysis: string;
  agentAgreementScore: number;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  confidenceFactors: ConfidenceFactors;
  evidence: DebateEvidenceOutput[];
  contextualFactors: string[];
  injectionAttemptDetected: boolean;
  lowSourceDiversity: boolean;
  isSatire: boolean;
}

function summarize(content: string, snippet: string, maxWords = 35): string {
  const source = content && content.trim().length > 30 ? content : snippet;
  if (!source) return 'Independent reporting on the factual assertions related to this claim.';
  const clean = source.replace(/\s+/g, ' ').trim();
  const sentenceMatch = clean.match(/^([^.!?]+[.!?](?:\s*[^.!?]+[.!?])?)/);
  let summary = sentenceMatch ? sentenceMatch[1].trim() : clean;
  const words = summary.split(' ');
  if (words.length > maxWords) summary = words.slice(0, maxWords).join(' ') + '...';
  return summary;
}

/**
 * Runs the full support/opposition/context/temporal/judge debate for a single
 * claim against its own independently-gathered evidence, then derives a
 * deterministic confidence score and per-source credibility/stance data.
 */
export async function runClaimDebate(input: DebateClaimInput): Promise<DebateClaimResult> {
  const { claim, evidence } = input;

  // Every agent gets the real current date explicitly, rather than relying
  // on its own training-data sense of "now" — a live analysis always runs
  // after the model's training cutoff, and without this an agent (most
  // acutely the Temporal Agent, whose whole job is judging recency) can
  // misjudge genuinely current, correctly-dated evidence as being "from the
  // future" simply because the date looks unfamiliar to it. Computed once
  // here (not inside each agent) so it's trivially mockable/testable and
  // guaranteed consistent across all five calls for a single claim.
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Build the untrusted evidence blob the sub-agents reason over.
  const evidenceContext = evidence.length
    ? evidence
        .map(
          (e, i) =>
            `--- Source ${i + 1}: ${e.publisher || e.domain} (${e.domain}) ---\nTitle: ${e.title}\nURL: ${e.sourceUrl}\nPublished: ${e.publishedAt || 'unknown'}\nContent: ${e.content}`,
        )
        .join('\n\n')
    : 'No independent web evidence was found for this claim.';

  const injectionScan = scanEvidenceForInjection(evidence.map((e) => ({ url: e.sourceUrl, text: e.content })));

  const [support, opposition, context, temporal] = await Promise.all([
    runSupportAgent(claim, evidenceContext, currentDate),
    runOppositionAgent(claim, evidenceContext, currentDate),
    runContextAgent(claim, evidenceContext, currentDate),
    runTemporalAgent(claim, evidenceContext, currentDate),
  ]);

  const sourceRefs: JudgeSourceRef[] = evidence.map((e) => ({
    sourceUrl: e.sourceUrl,
    domain: e.domain,
    snippet: e.snippet || e.content.slice(0, 300),
  }));

  const judge = await runJudgeAgent(claim, support, opposition, context, temporal, sourceRefs, currentDate);

  const stanceByUrl = new Map((judge.sourceStances || []).map((s) => [s.sourceUrl, s.stance]));

  // Ground per-source credibility in the deterministic domain-authority model,
  // not the LLM's own unsupported HIGH/MEDIUM/LOW guess.
  const credibilityByDomain = new Map<string, DomainCredibilityResult>();
  const evidenceOutput: DebateEvidenceOutput[] = evidence.map((e) => {
    let cred = credibilityByDomain.get(e.domain);
    if (!cred) {
      cred = evaluateDomainCredibility({ domain: e.domain, hasAuthor: e.hasAuthor, publishedAt: e.publishedAt });
      credibilityByDomain.set(e.domain, cred);
    }
    return {
      sourceUrl: e.sourceUrl,
      domain: e.domain,
      title: e.title,
      publisher: e.publisher || e.domain,
      snippet: e.snippet,
      summary: summarize(e.content, e.snippet),
      publishedAt: e.publishedAt,
      stance: stanceByUrl.get(e.sourceUrl) || 'NEUTRAL',
      credibility: cred.label,
      credibilityScore: cred.score,
      isSatire: cred.isSatire,
    };
  });

  const independentDomains = new Set(evidence.map((e) => e.domain));
  const lowSourceDiversity = independentDomains.size < 2;
  const dominantSatire = evidence.length > 0 && evidence.every((e) => isSatireDomain(e.domain));

  // --- Deterministic confidence ---
  const averageSourceReliability =
    evidenceOutput.length > 0
      ? evidenceOutput.reduce((sum, e) => sum + e.credibilityScore, 0) / evidenceOutput.length
      : 20; // no external verification at all — low, not fabricated, baseline

  const alignedVerdictIsPositive = ['TRUE', 'MOSTLY_TRUE'].includes(judge.verdict);
  const alignedVerdictIsNegative = ['FALSE', 'MOSTLY_FALSE'].includes(judge.verdict);
  let evidenceStrengthRatio = 0.5;
  if (evidenceOutput.length > 0 && (alignedVerdictIsPositive || alignedVerdictIsNegative)) {
    const aligned = evidenceOutput.filter((e) =>
      alignedVerdictIsPositive ? e.stance === 'SUPPORTS' : e.stance === 'CONTRADICTS',
    ).length;
    evidenceStrengthRatio = aligned / evidenceOutput.length;
  } else if (evidenceOutput.length === 0) {
    evidenceStrengthRatio = 0;
  }

  const recencyScore =
    evidenceOutput.length > 0
      ? evidenceOutput.reduce((sum, e) => sum + computeRecencyScore(e.publishedAt), 0) / evidenceOutput.length
      : 50;

  const confidenceFactors: ConfidenceFactors = {
    averageSourceReliability,
    evidenceStrengthRatio,
    multiAgentAgreement: judge.agentAgreementScore,
    recencyScore,
  };

  let confidenceBreakdown = calculateDeterministicConfidence(confidenceFactors);

  // Source-diversity requirement (§3.9): don't let a single-domain echo carry a
  // high-confidence verdict.
  if (lowSourceDiversity && confidenceBreakdown.totalConfidence > 55) {
    const cappedTotal = 55;
    confidenceBreakdown = { ...confidenceBreakdown, totalConfidence: cappedTotal };
  }

  const verdict = dominantSatire ? 'SATIRE' : judge.verdict;

  return {
    claimText: claim,
    verdict,
    explanation: dominantSatire
      ? `This claim originates from ${Array.from(independentDomains)[0]}, a known satire/parody publication. It is not a factual news report and should not be treated as misinformation.`
      : judge.explanation,
    temporalStatus: temporal.temporalStatus,
    temporalAnalysis: temporal.analysis,
    agentAgreementScore: judge.agentAgreementScore,
    confidence: confidenceBreakdown.totalConfidence,
    confidenceBreakdown,
    confidenceFactors,
    evidence: evidenceOutput,
    contextualFactors: context.contextualFactors,
    injectionAttemptDetected: Boolean(judge.injectionAttemptDetected) || injectionScan.anyDetected,
    lowSourceDiversity,
    isSatire: dominantSatire,
  };
}
