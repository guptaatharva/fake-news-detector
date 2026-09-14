// scripts/manual/eval-accuracy.ts
//
// One-off accuracy evaluation (REMAINING.md #10 — no ground-truth set existed
// before this). Runs a small, hand-curated set of claims with a known answer
// through the REAL pipeline — live SearchService web search, real scraping,
// real NVIDIA debate agents — bypassing the Next.js route/auth layer and
// calling the same underlying functions the routes call.
//
// For each claim, evidence is gathered ONCE and then run through BOTH:
//   - the real multi-agent debate (runClaimDebate — Support/Opposition/
//     Context/Temporal/Judge)
//   - a single non-debate LLM call (runBaselineVerdict below) — same model,
//     same evidence, one shot, no agent structure
// so the comparison isolates exactly one variable (debate structure vs a
// single call) rather than also letting the evidence set differ between the
// two. The deterministic SATIRE domain-check the debate system applies
// post-hoc (src/lib/satire.ts's isSatireDomain, NOT an LLM judgment) is
// applied identically to the baseline's evidence, so that shared,
// non-LLM piece of the pipeline doesn't get counted as a "debate win."
//
// This is a small, hand-curated set (~16 claims), not a statistically
// rigorous benchmark. It's meant to catch gross calibration problems and
// give concrete, real examples of the debate system in action — not to
// produce a publishable precision/recall figure.
//
// Usage: npx tsx scripts/manual/eval-accuracy.ts
// Writes results to scripts/manual/eval-results.json as it goes.

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

// Ground truth is asserted from well-established, non-time-sensitive facts —
// deliberately avoiding anything from after the evaluator's own knowledge
// cutoff, since the labels here have to be trustworthy on their own.
const EVAL_SET: EvalCase[] = [
  { id: 'true-1', claim: 'Mount Everest is the tallest mountain above sea level on Earth.', category: 'clear true', expected: 'TRUE', notes: 'Undisputed geographic fact.' },
  { id: 'true-2', claim: 'Water boils at 100 degrees Celsius at standard atmospheric pressure.', category: 'clear true', expected: 'TRUE', notes: 'Basic, undisputed physical fact.' },
  { id: 'true-3', claim: 'The Great Barrier Reef has experienced significant coral bleaching events due to rising ocean temperatures.', category: 'clear true', expected: 'TRUE', notes: 'Well-documented, extensively reported.' },
  // Ground truth corrected after the first live run: the claim as worded
  // ("several centimeters") overstates real vertical thermal expansion
  // (millimeters, per Snopes/the tower's own site) by roughly 10x, so the
  // defensible verdict for this exact wording is FALSE-ish, not TRUE. The
  // pipeline caught this magnitude exaggeration correctly on the first run —
  // the original TRUE label here was a grading error, not a pipeline miss.
  { id: 'true-4', claim: 'The Eiffel Tower grows several centimeters taller in summer due to thermal expansion of its iron structure.', category: 'surprising but exaggerated (corrected label)', expected: 'FALSE', notes: 'The real vertical growth is millimeters, not centimeters — this wording overstates the magnitude by ~10x, so a correct system should downgrade it despite the underlying phenomenon being real.' },
  { id: 'true-5', claim: 'The Great Wall of China is not visible to the naked eye from the Moon.', category: 'true correction of a myth', expected: 'TRUE', notes: 'Correctly-phrased debunking of the popular myth — tests that the system does not conflate this with the (false) myth itself.' },

  { id: 'false-1', claim: 'The Great Wall of China is visible to the naked eye from the Moon.', category: 'common myth', expected: 'FALSE', notes: 'Classic, thoroughly debunked myth.' },
  { id: 'false-2', claim: 'Vaccines cause autism.', category: 'debunked misinformation', expected: 'FALSE', notes: 'Extensively studied and debunked; high-stakes misinformation.' },
  { id: 'false-3', claim: '5G wireless technology causes or spreads COVID-19.', category: 'debunked misinformation', expected: 'FALSE', notes: 'Well-known conspiracy claim, thoroughly debunked.' },
  { id: 'false-4', claim: 'Humans only use 10 percent of their brains.', category: 'common myth', expected: 'FALSE', notes: 'Neuroscience myth, long debunked.' },
  { id: 'false-5', claim: 'Goldfish have a memory span of only three seconds.', category: 'common myth', expected: 'FALSE', notes: 'Goldfish memory is documented to be months long.' },
  { id: 'false-6', claim: 'Napoleon Bonaparte was unusually short for his era, standing about five feet two inches tall.', category: 'common myth', expected: 'FALSE', notes: 'Myth from a French-to-English inch conversion error; he was roughly average/above-average height for the time.' },
  { id: 'false-7', claim: 'Bulls become enraged specifically at the sight of the color red.', category: 'common myth', expected: 'FALSE', notes: 'Bulls are red-green colorblind; it is the cape\'s movement that provokes them.' },
  { id: 'false-8', claim: 'Lightning never strikes the same place twice.', category: 'common myth', expected: 'FALSE', notes: 'Demonstrably false — e.g. the Empire State Building is struck roughly 20-25 times a year.' },
  { id: 'false-9', claim: 'Left-handed people die on average nine years younger than right-handed people.', category: 'statistical misrepresentation', expected: 'FALSE', notes: 'Famous statistic from a since-discredited 1991 study; a good test of a claim that sounds statistically precise but is false.' },

  { id: 'satire-1', claim: 'The Onion reported that area man is a passionate defender of what he imagines the Constitution to be.', category: 'satire', expected: 'SATIRE', notes: 'Real Onion headline — tests that known-satire sourcing is labeled SATIRE, not scored as misinformation.' },

  { id: 'outdated-1', claim: 'Pluto is classified as the ninth planet in our solar system.', category: 'outdated but was true', expected: 'FALSE', notes: 'True until the IAU reclassified Pluto as a dwarf planet in 2006 — stated in the present tense, this is now false. A good test of temporal-mismatch handling, not just raw truth.' },
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
  explanation: z.string().describe('Brief explanation for the verdict.'),
});

/**
 * The "shallow" comparison point: one LLM call, same model, same evidence
 * formatting as the real debate system, no Support/Opposition/Context/
 * Temporal/Judge structure — just "here's a claim and some evidence, what's
 * the verdict?" Isolates whether the multi-agent structure itself is doing
 * anything a single call wouldn't.
 */
async function runBaselineVerdict(claim: string, evidence: DebateEvidenceInput[]): Promise<{ verdict: string; explanation: string; isSatire: boolean }> {
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
  "explanation": "brief explanation"
}`,
    maxTokens: 1024,
  });

  // Apply the same deterministic, non-LLM satire-domain check the real
  // debate system applies (src/lib/satire.ts), so this shared piece of
  // logic doesn't get counted as a point in either side's favor.
  const dominantSatire = evidence.length > 0 && evidence.every((e) => isSatireDomain(e.domain));

  return { verdict: dominantSatire ? 'SATIRE' : object.verdict, explanation: object.explanation, isSatire: dominantSatire };
}

async function run() {
  // Optional: node/tsx ... eval-accuracy.ts <id> re-runs just one case (e.g.
  // to retry one that failed on a transient provider error) instead of the
  // whole set, and merges its result into the existing eval-results.json.
  const onlyId = process.argv[2];
  const caseSet = onlyId ? EVAL_SET.filter((c) => c.id === onlyId) : EVAL_SET;
  if (onlyId && caseSet.length === 0) {
    console.error(`No eval case with id "${onlyId}"`);
    process.exit(1);
  }

  const resultsPath = path.join(__dirname, 'eval-results.json');
  const existing: any[] = onlyId && fs.existsSync(resultsPath) ? JSON.parse(fs.readFileSync(resultsPath, 'utf8')) : [];
  const results: any[] = onlyId ? existing.filter((r) => r.id !== onlyId) : [];
  let debateCorrect = 0;
  let baselineCorrect = 0;
  const falseCases = EVAL_SET.filter((c) => c.expected === 'FALSE');
  let debateFalseCaught = 0;
  let baselineFalseCaught = 0;

  for (const evalCase of caseSet) {
    console.log(`\n=== ${evalCase.id} (${evalCase.category}) ===`);
    console.log(`Claim: "${evalCase.claim}"`);
    console.log(`Expected: ${evalCase.expected}`);

    const start = Date.now();
    try {
      const evidence = await gatherEvidence(evalCase.claim);
      console.log(`  Gathered ${evidence.length} evidence source(s): ${evidence.map((e) => e.domain).join(', ') || '(none)'}`);

      // Same evidence, run through both approaches, so only the reasoning
      // structure differs between them.
      const [debateResult, baselineResult] = await Promise.all([
        runClaimDebate({ claim: evalCase.claim, evidence }),
        runBaselineVerdict(evalCase.claim, evidence),
      ]);

      const debateBucket = bucketize(debateResult.isSatire ? 'SATIRE' : debateResult.verdict);
      const debateIsCorrect = debateBucket === evalCase.expected;
      if (debateIsCorrect) debateCorrect++;
      if (evalCase.expected === 'FALSE' && debateBucket === 'FALSE') debateFalseCaught++;

      const baselineBucket = bucketize(baselineResult.verdict);
      const baselineIsCorrect = baselineBucket === evalCase.expected;
      if (baselineIsCorrect) baselineCorrect++;
      if (evalCase.expected === 'FALSE' && baselineBucket === 'FALSE') baselineFalseCaught++;

      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  → Debate:   ${debateResult.verdict}${debateResult.isSatire ? ' (SATIRE)' : ''} (bucket=${debateBucket}) | confidence=${debateResult.confidence}% | agreement=${debateResult.agentAgreementScore} | ${debateIsCorrect ? 'CORRECT' : 'MISMATCH'}`);
      console.log(`  → Baseline: ${baselineResult.verdict} (bucket=${baselineBucket}) | ${baselineIsCorrect ? 'CORRECT' : 'MISMATCH'} | ${elapsedSec}s`);

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
          explanation: baselineResult.explanation,
          correct: baselineIsCorrect,
        },
        elapsedSec: Number(elapsedSec),
      });
    } catch (e: any) {
      console.error(`  ERROR: ${e.message}`);
      results.push({ ...evalCase, error: e.message, debate: { correct: false }, baseline: { correct: false } });
    }

    fs.writeFileSync(path.join(__dirname, 'eval-results.json'), JSON.stringify(results, null, 2));
  }

  console.log(`\n\n========== SUMMARY ==========`);
  console.log(`Debate accuracy:   ${debateCorrect}/${EVAL_SET.length} (${((debateCorrect / EVAL_SET.length) * 100).toFixed(0)}%) | false-recall ${debateFalseCaught}/${falseCases.length}`);
  console.log(`Baseline accuracy: ${baselineCorrect}/${EVAL_SET.length} (${((baselineCorrect / EVAL_SET.length) * 100).toFixed(0)}%) | false-recall ${baselineFalseCaught}/${falseCases.length}`);
  console.log(`Full results written to scripts/manual/eval-results.json`);
}

run().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
