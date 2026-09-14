// scripts/manual/eval-accuracy-hard.ts
//
// A second, harder evaluation set (REMAINING.md #10) — real, current,
// verifiably-sourced news claims (a very recently retracted landmark study,
// real 2026 disaster statistics, a narrow corporate restatement) rather than
// textbook facts and classic myths, which is what eval-accuracy.ts's first
// set turned out to mostly be. That first set found no accuracy difference
// between the multi-agent debate and a single LLM call given the same
// evidence — this set specifically targets the conditions where a
// difference would be more likely to show up: genuine recency traps,
// thinly-covered claims, and a true statistic with an unsupported causal
// claim tacked onto it.
//
// Same methodology as eval-accuracy.ts: evidence gathered once per claim,
// run through both the real debate system and a single non-debate LLM call.
// This time the baseline also reports its own confidence (0-100), so
// confidence — not just the verdict bucket — can be compared too.
//
// Usage: npx tsx scripts/manual/eval-accuracy-hard.ts
// Writes results to scripts/manual/eval-results-hard.json as it goes.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SearchService } from '../../src/lib/services/search.service';
import { extractWithDiagnostics } from '../../src/lib/extractor';
import { runClaimDebate, type DebateEvidenceInput } from '../../src/lib/agents/debateOrchestrator';
import { nvidiaGenerateObject } from '../../src/lib/nvidia';
import { UNTRUSTED_CONTENT_GUARD, wrapUntrustedContent } from '../../src/lib/promptSafety';
import { isSatireDomain } from '../../src/lib/satire';

type ExpectedBucket = 'TRUE' | 'FALSE' | 'SATIRE' | 'MIXTURE';

interface EvalCase {
  id: string;
  claim: string;
  category: string;
  expected: ExpectedBucket;
  notes: string;
}

// Ground truth sourced via independent web research at the time this set was
// written (September 2026) — see notes per case for the source. Deliberately
// avoids politically polarizing claims (e.g. a fact-check about a political
// figure's statement count came up in research and was excluded) to keep
// this a test of evidence-handling, not a test of political judgment.
const EVAL_SET: EvalCase[] = [
  {
    id: 'ariely-outdated',
    claim: 'A widely-cited 2002 psychology study concluding that externally-imposed deadlines improve performance more than self-set deadlines is a reliable, well-established finding.',
    category: 'very recent retraction (temporal trap)',
    expected: 'FALSE',
    notes: 'The Ariely/Wertenbroch procrastination study (2,100+ citations, taught for two decades) was retracted by Psychological Science on ~Sept 3, 2026 after a failed replication and a Data Colada data-manipulation investigation. Asserted as "reliable" in the present tense, this is now false — and very freshly so (the retraction is only days old at claim-writing time), a genuine test of whether live search surfaces up-to-the-minute corrections.',
  },
  {
    id: 'ariely-correct',
    claim: 'A widely-cited 2002 psychology study on deadlines and procrastination by Dan Ariely was retracted in September 2026 after a failed replication and evidence of data manipulation.',
    category: 'very recent retraction (correctly stated)',
    expected: 'TRUE',
    notes: 'Same underlying event as ariely-outdated, correctly worded this time — pairs the two to test both directions.',
  },
  {
    id: 'replication-crisis',
    claim: 'A large-scale, multi-year project found that roughly half of social science studies failed to replicate.',
    category: 'real, well-documented science finding',
    expected: 'TRUE',
    notes: 'Reported by Nature; a large systematic replication effort found roughly half of tested social-science studies did not replicate.',
  },
  {
    id: 'venezuela-earthquake',
    claim: 'A double earthquake measuring magnitude 7.2 and 7.5 struck near the town of Morón, Venezuela on June 24, 2026, with preliminary total economic losses estimated around $30 billion.',
    category: 'real, specific 2026 disaster statistic',
    expected: 'TRUE',
    notes: 'Per Swiss Re\'s first-half 2026 catastrophe report: a double earthquake ~200km west of Caracas near Morón, M7.2/7.5, preliminary total losses ~$30bn (insured losses under $1bn).',
  },
  {
    id: 'oregon-wildfires',
    claim: 'Wildfires in Oregon in 2026 had burned more than two million acres by early August, setting a new record.',
    category: 'real, specific 2026 disaster statistic',
    expected: 'TRUE',
    notes: 'Per Center for Disaster Philanthropy\'s Aug 3, 2026 weekly disaster update: Oregon wildfires broke records with over two million acres burned as of that date.',
  },
  {
    id: 'disaster-losses-stat',
    claim: 'Global natural disasters caused roughly $112 billion in economic losses in the first half of 2026, with about 60% of those losses uninsured.',
    category: 'real, compound 2026 statistic',
    expected: 'TRUE',
    notes: 'Per Munich Re\'s first-half 2026 natural disaster review: ~$112bn total losses, ~$44bn insured — a roughly 60% insurance gap.',
  },
  {
    id: 'disaster-losses-spin',
    claim: 'Global disaster losses in the first half of 2026 were about 60% uninsured, which proves the insurance industry is abandoning natural disaster coverage.',
    category: 'true statistic + unsupported causal spin',
    expected: 'MIXTURE',
    notes: 'The 60% figure is real (see disaster-losses-stat), but "proves the insurance industry is abandoning natural disaster coverage" is an unsupported editorial leap the source data doesn\'t establish — the exact statistical-misrepresentation pattern, built on a real, current statistic instead of a hypothetical one.',
  },
  {
    id: 'bayfirst-restatement',
    claim: 'BayFirst Financial Corp restated its 2025 net loss from $22.9 million to $24.2 million after identifying accounting errors related to deferred origination costs and accrued interest on defaulted loans.',
    category: 'narrow, thinly-covered real claim',
    expected: 'TRUE',
    notes: 'Per BayFirst Financial Corp\'s 2026 SEC Form 8-K: identified $2.8M of deferred origination costs and $2.1M of accrued interest misstatements; restated 2025 net loss from $22.9M to $24.2M. Likely to have thin, SEC-filing-dominated web coverage — a realistic low-evidence stress test rather than a claim with abundant corroborating news coverage.',
  },
];

function bucketize(verdict: string): ExpectedBucket | 'UNVERIFIABLE' {
  if (verdict === 'TRUE' || verdict === 'MOSTLY_TRUE') return 'TRUE';
  if (verdict === 'FALSE' || verdict === 'MOSTLY_FALSE') return 'FALSE';
  if (verdict === 'SATIRE') return 'SATIRE';
  if (verdict === 'MIXTURE') return 'MIXTURE';
  return 'UNVERIFIABLE';
}

async function gatherEvidence(claim: string): Promise<DebateEvidenceInput[]> {
  const raw = await SearchService.searchWeb(claim, 8).catch((e) => {
    console.warn(`  [search] failed: ${e.message}`);
    return [];
  });

  const seenDomains = new Set<string>();
  const candidates = raw.filter((r) => {
    const url = r.sourceUrl || r.link;
    if (!url || url.includes('news.google.com')) return false;
    let domain = r.domain;
    try {
      if (!domain) domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return false;
    }
    if (seenDomains.has(domain)) return false;
    seenDomains.add(domain);
    return true;
  }).slice(0, 3);

  const evidence: DebateEvidenceInput[] = [];
  for (const c of candidates) {
    const url = c.sourceUrl || c.link;
    try {
      const result = await extractWithDiagnostics(url);
      if (result.qualityOk && result.text.length >= 150) {
        evidence.push({
          sourceUrl: url,
          domain: c.domain || new URL(url).hostname.replace(/^www\./, ''),
          title: c.title || '',
          snippet: c.snippet || '',
          content: result.text.replace(/\s+/g, ' ').slice(0, 1500),
          publisher: c.source || c.domain,
          publishedAt: result.publishedAt || c.publishedAt,
          hasAuthor: Boolean(result.byline),
        });
      } else {
        console.warn(`  [scrape] rejected ${url} (quality=${result.qualityOk}, len=${result.text.length})`);
      }
    } catch (e: any) {
      console.warn(`  [scrape] failed ${url}: ${e.message}`);
    }
  }
  return evidence;
}

const BaselineSchema = z.object({
  verdict: z.enum(['TRUE', 'MOSTLY_TRUE', 'MIXTURE', 'MOSTLY_FALSE', 'FALSE', 'UNVERIFIABLE']).describe('Verdict for the claim based on the evidence.'),
  confidence: z.number().min(0).max(100).describe('Confidence (0-100) in this verdict, given the evidence.'),
  explanation: z.string().describe('Brief explanation for the verdict.'),
});

async function runBaselineVerdict(claim: string, evidence: DebateEvidenceInput[]): Promise<{ verdict: string; confidence: number; explanation: string; isSatire: boolean }> {
  const evidenceContext = evidence.length
    ? evidence
        .map((e, i) => `--- Source ${i + 1}: ${e.publisher || e.domain} (${e.domain}) ---\nTitle: ${e.title}\nURL: ${e.sourceUrl}\nPublished: ${e.publishedAt || 'unknown'}\nContent: ${e.content}`)
        .join('\n\n')
    : 'No independent web evidence was found for this claim.';

  const { object } = await nvidiaGenerateObject({
    schema: BaselineSchema,
    callerLabel: 'BaselineSingleCall',
    prompt: `Fact-check the following claim using ONLY the evidence provided below.

Claim: "${claim}"

${UNTRUSTED_CONTENT_GUARD}

${wrapUntrustedContent('evidence', evidenceContext)}

Return ONLY raw valid JSON matching this exact structure, no markdown fences, no prose:
{
  "verdict": "TRUE" | "MOSTLY_TRUE" | "MIXTURE" | "MOSTLY_FALSE" | "FALSE" | "UNVERIFIABLE",
  "confidence": 0-100,
  "explanation": "brief explanation"
}`,
    // No maxTokens override — matches the debate system's own Judge agent
    // (the closest analog: it also makes the final call with extended
    // thinking enabled), so the baseline gets comparable "thinking room"
    // rather than being truncated mid-reasoning on a nuanced claim.
  });

  const dominantSatire = evidence.length > 0 && evidence.every((e) => isSatireDomain(e.domain));
  return { verdict: dominantSatire ? 'SATIRE' : object.verdict, confidence: object.confidence, explanation: object.explanation, isSatire: dominantSatire };
}

async function run() {
  const onlyId = process.argv[2];
  const caseSet = onlyId ? EVAL_SET.filter((c) => c.id === onlyId) : EVAL_SET;
  if (onlyId && caseSet.length === 0) {
    console.error(`No eval case with id "${onlyId}"`);
    process.exit(1);
  }

  const resultsPath = path.join(__dirname, 'eval-results-hard.json');
  const existing: any[] = onlyId && fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf8')) : [];
  const results: any[] = onlyId ? existing.filter((r) => r.id !== onlyId) : [];
  let debateCorrect = 0;
  let baselineCorrect = 0;

  for (const evalCase of caseSet) {
    console.log(`\n=== ${evalCase.id} (${evalCase.category}) ===`);
    console.log(`Claim: "${evalCase.claim}"`);
    console.log(`Expected: ${evalCase.expected}`);

    const start = Date.now();
    try {
      const evidence = await gatherEvidence(evalCase.claim);
      console.log(`  Gathered ${evidence.length} evidence source(s): ${evidence.map((e) => e.domain).join(', ') || '(none)'}`);

      const [debateResult, baselineResult] = await Promise.all([
        runClaimDebate({ claim: evalCase.claim, evidence }),
        runBaselineVerdict(evalCase.claim, evidence),
      ]);

      const debateBucket = bucketize(debateResult.isSatire ? 'SATIRE' : debateResult.verdict);
      const debateIsCorrect = debateBucket === evalCase.expected;
      if (debateIsCorrect) debateCorrect++;

      const baselineBucket = bucketize(baselineResult.verdict);
      const baselineIsCorrect = baselineBucket === evalCase.expected;
      if (baselineIsCorrect) baselineCorrect++;

      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  → Debate:   ${debateResult.verdict}${debateResult.isSatire ? ' (SATIRE)' : ''} (bucket=${debateBucket}) | confidence=${debateResult.confidence}% | agreement=${debateResult.agentAgreementScore} | ${debateIsCorrect ? 'CORRECT' : 'MISMATCH'}`);
      console.log(`  → Baseline: ${baselineResult.verdict} (bucket=${baselineBucket}) | confidence=${baselineResult.confidence}% | ${baselineIsCorrect ? 'CORRECT' : 'MISMATCH'} | ${elapsedSec}s`);

      results.push({
        ...evalCase,
        sourceDomains: evidence.map((e) => e.domain),
        debate: {
          actualVerdict: debateResult.verdict,
          actualBucket: debateBucket,
          confidence: debateResult.confidence,
          agentAgreementScore: debateResult.agentAgreementScore,
          isSatire: debateResult.isSatire,
          temporalStatus: debateResult.temporalStatus,
          explanation: debateResult.explanation,
          correct: debateIsCorrect,
        },
        baseline: {
          actualVerdict: baselineResult.verdict,
          actualBucket: baselineBucket,
          confidence: baselineResult.confidence,
          explanation: baselineResult.explanation,
          correct: baselineIsCorrect,
        },
        elapsedSec: Number(elapsedSec),
      });
    } catch (e: any) {
      console.error(`  ERROR: ${e.message}`);
      results.push({ ...evalCase, error: e.message, debate: { correct: false }, baseline: { correct: false } });
    }

    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  }

  console.log(`\n\n========== SUMMARY ==========`);
  console.log(`Debate accuracy:   ${debateCorrect}/${EVAL_SET.length} (${((debateCorrect / EVAL_SET.length) * 100).toFixed(0)}%)`);
  console.log(`Baseline accuracy: ${baselineCorrect}/${EVAL_SET.length} (${((baselineCorrect / EVAL_SET.length) * 100).toFixed(0)}%)`);
  console.log(`Full results written to scripts/manual/eval-results-hard.json`);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
