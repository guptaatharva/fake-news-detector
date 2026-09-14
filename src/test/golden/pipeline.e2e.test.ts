import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  ORIGINAL_ARTICLE_URL,
  ORIGINAL_ARTICLE_HTML,
  NVIDIA_EXTRACT_RESPONSE,
  REUTERS_URL,
  APNEWS_URL,
  REUTERS_ARTICLE_HTML,
  APNEWS_ARTICLE_HTML,
  gnewsResponseFor,
  NVIDIA_DEBATE_RESPONSES,
} from './fixtures';

// ---------------------------------------------------------------------------
// Golden-set end-to-end pipeline test (§REMAINING.md #13).
//
// Every other route test in this repo mocks the LLM/network boundary right
// at the module doing the call (extractTextFromUrl, SearchService.searchWeb,
// nvidiaGenerateObject) — solid for testing each route's own logic in
// isolation, but nothing exercises the real parsing code (Readability HTML
// extraction, the GNews response-shape mapping) against anything shaped like
// what those providers actually return, and nothing runs the full
// extract → search → scrape → debate → aggregate chain the way the dashboard
// actually drives it.
//
// This test does that: it calls the real route handlers, in the same
// sequence src/app/dashboard/page.tsx calls them, and only replaces the
// outermost network boundary (global fetch, for the search/scrape HTTP
// calls; nvidiaGenerateObject, for the LLM calls) with VCR-style recorded
// fixtures (src/test/golden/fixtures.ts) shaped like real provider payloads.
// Everything in between — SearchService's GNews parsing, extractor.ts's
// Readability pipeline and boilerplate stripping, the debate orchestrator,
// confidence.ts's scoring formula, and the aggregateResult step the
// dashboard itself uses — runs for real.
//
// A regression in how any of those pieces fit together (a field rename, a
// provider response shape nobody re-checked, a broken accept/reject
// threshold) fails this test even though every individual unit test still
// passes with its own mocks.

vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: vi.fn().mockResolvedValue({ ok: true, userId: 'golden-test-user' }),
}));

vi.mock('@/lib/security/ssrf', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/ssrf')>('@/lib/security/ssrf');
  return { ...actual, assertSafeUrl: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('@/lib/security/robots', async () => {
  const actual = await vi.importActual<typeof import('@/lib/security/robots')>('@/lib/security/robots');
  return { ...actual, isScrapingAllowed: vi.fn().mockResolvedValue(true) };
});

const nvidiaGenerateObject = vi.fn();
vi.mock('@/lib/nvidia', async () => {
  const actual = await vi.importActual<typeof import('@/lib/nvidia')>('@/lib/nvidia');
  return { ...actual, nvidiaGenerateObject: (...args: any[]) => nvidiaGenerateObject(...args) };
});

// Mirrors dashboard/page.tsx's SOURCES_PER_CLAIM.
const SOURCES_PER_CLAIM = 3;

function makeReq(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Recorded HTML/JSON responses, routed by exact URL — the "cassette". */
function buildFetchRouter() {
  const html = (body: string) =>
    new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });

  return vi.fn(async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url === ORIGINAL_ARTICLE_URL) return html(ORIGINAL_ARTICLE_HTML);
    if (url === REUTERS_URL) return html(REUTERS_ARTICLE_HTML);
    if (url === APNEWS_URL) return html(APNEWS_ARTICLE_HTML);
    if (url.startsWith('https://gnews.io/api/v4/search')) {
      const query = new URL(url).searchParams.get('q') || '';
      return new Response(JSON.stringify(gnewsResponseFor(query)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw new Error(`[golden test] Unrecorded fetch for URL: ${url}`);
  });
}

describe('Golden set: full analysis pipeline (recorded fixtures)', () => {
  const originalFetch = global.fetch;
  const originalGnewsKey = process.env.GNEWS_API_KEY;

  beforeAll(() => {
    process.env.GNEWS_API_KEY = 'golden-test-key';
    global.fetch = buildFetchRouter() as unknown as typeof fetch;

    nvidiaGenerateObject.mockImplementation(async (options: any) => {
      if (options.callerLabel === 'Extract') return NVIDIA_EXTRACT_RESPONSE;
      const fixture = NVIDIA_DEBATE_RESPONSES[options.callerLabel];
      if (!fixture) throw new Error(`[golden test] No recorded NVIDIA response for callerLabel: ${options.callerLabel}`);
      return fixture;
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.GNEWS_API_KEY = originalGnewsKey;
  });

  it('runs extract → search → scrape → debate → aggregate and reaches a well-corroborated verdict', async () => {
    // --- Stage 1: Extract claims from the source URL (real Readability extraction + mocked NVIDIA) ---
    const { POST: extractPOST } = await import('@/app/api/analyze/extract/route');
    const extractRes = await extractPOST(makeReq('http://localhost/api/analyze/extract', { url: ORIGINAL_ARTICLE_URL }));
    expect(extractRes.status).toBe(200);
    const extractData = await extractRes.json();

    expect(extractData.claims).toHaveLength(2);
    expect(extractData.originalText).toContain('nationwide vaccination campaign');

    const { POST: searchPOST } = await import('@/app/api/analyze/search-query/route');
    const { POST: scrapePOST } = await import('@/app/api/analyze/scrape/route');
    const { POST: debatePOST } = await import('@/app/api/analyze/debate/route');
    const { aggregateResult } = await import('@/lib/pipeline/aggregateResult');

    const allScrapedSources: any[] = [];
    const claims: any[] = [];

    for (const claimText of extractData.claims as string[]) {
      // --- Stage 2: Search for corroborating sources (real GNews response parsing) ---
      const searchRes = await searchPOST(
        makeReq('http://localhost/api/analyze/search-query', { claim: claimText, originalUrl: ORIGINAL_ARTICLE_URL }),
      );
      expect(searchRes.status).toBe(200);
      const searchData = await searchRes.json();
      expect(searchData.results.length).toBeGreaterThan(0);
      // The original article's own domain must never come back as "corroborating" evidence.
      expect(searchData.results.some((r: any) => r.domain === 'example-news.test')).toBe(false);

      const candidates = searchData.results.slice(0, SOURCES_PER_CLAIM);
      const scrapedForClaim: any[] = [];

      // --- Stage 3: Scrape each candidate (real Readability extraction again, on different fixture HTML) ---
      for (const candidate of candidates) {
        const scrapeRes = await scrapePOST(makeReq('http://localhost/api/analyze/scrape', { url: candidate.sourceUrl }));
        const scrapeData = await scrapeRes.json();
        if (scrapeRes.ok && scrapeData.text && scrapeData.text.length >= 150) {
          scrapedForClaim.push({
            sourceUrl: candidate.sourceUrl,
            domain: candidate.domain,
            title: candidate.title,
            snippet: candidate.snippet,
            content: scrapeData.text.slice(0, 1500),
            publisher: candidate.source,
            publishedAt: scrapeData.publishedAt || candidate.publishedAt,
            hasAuthor: Boolean(scrapeData.byline),
          });
        }
      }

      expect(scrapedForClaim.length).toBeGreaterThan(0);
      allScrapedSources.push(...scrapedForClaim);

      // --- Stage 4: Multi-agent debate over this claim's own evidence (mocked NVIDIA, real orchestration/scoring) ---
      const debateRes = await debatePOST(
        makeReq('http://localhost/api/analyze/debate', { claim: claimText, evidence: scrapedForClaim }),
      );
      expect(debateRes.status).toBe(200);
      const debateData = await debateRes.json();
      claims.push(debateData);
    }

    // --- Stage 5: Aggregate (the exact pure function the dashboard uses) ---
    const result = aggregateResult(claims, allScrapedSources);

    expect(result.verdict).toBe('MOSTLY_TRUE');
    expect(result.confidenceScore).toBeGreaterThan(60);
    expect(result.lowSourceDiversity).toBe(false);
    expect(new Set(result.sourceDomains)).toEqual(new Set(['reuters.com', 'apnews.com']));
    expect(result.claims).toHaveLength(2);
    for (const claim of result.claims) {
      expect(claim.evidence?.length).toBeGreaterThan(0);
      expect(claim.agentAgreementScore).toBeCloseTo(0.9, 5);
    }
  });
});
