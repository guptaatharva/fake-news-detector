import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Integration test for the core verification pipeline: the route handler,
// the debate orchestrator, and the real (unmocked) confidence.ts/
// credibility.ts formulas all run for real here — only the NVIDIA network
// call itself is mocked, keyed by each agent's callerLabel so every agent in
// the debate gets a schema-appropriate canned response.

vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: vi.fn().mockResolvedValue({ ok: true, userId: 'test-user' }),
}));

const nvidiaGenerateObject = vi.fn();
vi.mock('@/lib/nvidia', async () => {
  const actual = await vi.importActual<typeof import('@/lib/nvidia')>('@/lib/nvidia');
  return {
    ...actual,
    nvidiaGenerateObject: (...args: any[]) => nvidiaGenerateObject(...args),
  };
});

function mockAgentsFor(verdict: string, agentAgreementScore: number, sourceStances: Array<{ sourceUrl: string; stance: string }> = []) {
  nvidiaGenerateObject.mockImplementation(async (options: any) => {
    switch (options.callerLabel) {
      case 'DebateSupport':
        return { object: { supportingArguments: ['The evidence corroborates the claim.'], confidenceInSupport: 80 } };
      case 'DebateOpposition':
        return { object: { contradictingArguments: [], confidenceInOpposition: 10 } };
      case 'DebateContext':
        return { object: { contextualFactors: [], temporalRelevance: 'No timeline issues.' } };
      case 'DebateTemporal':
        return { object: { temporalStatus: 'CURRENTLY_VALID', analysis: 'The evidence is current.' } };
      case 'DebateJudge':
        return {
          object: {
            verdict,
            explanation: 'Based on the weight of supporting evidence.',
            agentAgreementScore,
            sourceStances,
            injectionAttemptDetected: false,
          },
        };
      default:
        throw new Error(`Unexpected callerLabel in test: ${options.callerLabel}`);
    }
  });
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze/debate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/analyze/debate', () => {
  it('reaches a TRUE verdict with a high, source-credibility-driven confidence for well-corroborated evidence', async () => {
    mockAgentsFor('TRUE', 0.9, [
      { sourceUrl: 'https://reuters.com/story', stance: 'SUPPORTS' },
      { sourceUrl: 'https://apnews.com/story', stance: 'SUPPORTS' },
    ]);

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({
        claim: 'The central bank raised interest rates by 0.25%.',
        evidence: [
          {
            sourceUrl: 'https://reuters.com/story',
            domain: 'reuters.com',
            title: 'Central bank raises rates',
            snippet: 'The bank raised rates today.',
            content: 'The central bank raised interest rates by a quarter point, citing inflation concerns.',
            publisher: 'Reuters',
            publishedAt: new Date().toISOString(),
          },
          {
            sourceUrl: 'https://apnews.com/story',
            domain: 'apnews.com',
            title: 'Fed raises rates',
            snippet: 'Confirming the rate hike.',
            content: 'The Federal Reserve confirmed a quarter-point interest rate increase today.',
            publisher: 'AP News',
            publishedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verdict).toBe('TRUE');
    // Two independent HIGH-credibility, recent, fully-supporting sources + 0.9 agreement — no diversity cap applies.
    expect(json.confidence).toBeGreaterThan(75);
    expect(json.evidence[0].credibility).toBe('HIGH'); // computed by credibility.ts, not the mocked judge
    expect(json.evidence[0].stance).toBe('SUPPORTS');
    expect(json.lowSourceDiversity).toBe(false); // 2 independent domains
  });

  it('caps confidence when fewer than 2 independent domains corroborate the verdict', async () => {
    mockAgentsFor('TRUE', 1.0, [{ sourceUrl: 'https://example.com/a', stance: 'SUPPORTS' }]);

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({
        claim: 'A claim with only one source.',
        evidence: [
          {
            sourceUrl: 'https://example.com/a',
            domain: 'example.com',
            title: 'Story',
            snippet: 'snippet',
            content: 'content supporting the claim',
          },
        ],
      }),
    );
    const json = await res.json();
    expect(json.lowSourceDiversity).toBe(true);
    expect(json.confidence).toBeLessThanOrEqual(55);
  });

  it('caps confidence and flags lowSourceDiversity when multiple domains belong to the same conglomerate', async () => {
    mockAgentsFor('TRUE', 0.95, [
      { sourceUrl: 'https://timesofindia.indiatimes.com/story', stance: 'SUPPORTS' },
      { sourceUrl: 'https://economictimes.indiatimes.com/story', stance: 'SUPPORTS' },
    ]);

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({
        claim: 'Market hit record highs today.',
        evidence: [
          {
            sourceUrl: 'https://timesofindia.indiatimes.com/story',
            domain: 'timesofindia.indiatimes.com',
            title: 'Sensex surges',
            snippet: 'Markets rallied today.',
            content: 'Detailed reporting on record highs.',
            publishedAt: new Date().toISOString(),
          },
          {
            sourceUrl: 'https://economictimes.indiatimes.com/story',
            domain: 'economictimes.indiatimes.com',
            title: 'Economic boom continues',
            snippet: 'Markets rallied today.',
            content: 'Detailed financial reporting.',
            publishedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    // Both domains belong to times-group, so true diversity is 1
    expect(json.lowSourceDiversity).toBe(true);
    expect(json.confidence).toBeLessThanOrEqual(55);
  });

  it('labels a claim from a known satire domain as SATIRE regardless of the judge verdict', async () => {
    mockAgentsFor('FALSE', 0.8);

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({
        claim: 'A ridiculous headline shared as if it were real news.',
        evidence: [
          {
            sourceUrl: 'https://theonion.com/story',
            domain: 'theonion.com',
            title: 'Satirical headline',
            snippet: 'snippet',
            content: 'This is obviously satire.',
          },
        ],
      }),
    );
    const json = await res.json();
    expect(json.verdict).toBe('SATIRE');
    expect(json.isSatire).toBe(true);
  });

  it('handles a claim with zero evidence without crashing, at low confidence', async () => {
    mockAgentsFor('UNVERIFIABLE', 0);

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ claim: 'An unverifiable claim.', evidence: [] }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.verdict).toBe('UNVERIFIABLE');
    expect(json.confidence).toBeLessThan(30);
  });

  it('rejects more than 10 evidence items (Zod cap)', async () => {
    const { POST } = await import('./route');
    const evidence = Array.from({ length: 11 }, (_, i) => ({
      sourceUrl: `https://example.com/${i}`,
      domain: 'example.com',
      title: 't',
      snippet: 's',
      content: 'c',
    }));
    const res = await POST(makeRequest({ claim: 'Too many sources.', evidence }));
    expect(res.status).toBe(400);
  });

  it('rejects a missing claim', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ evidence: [] }));
    expect(res.status).toBe(400);
  });
});
