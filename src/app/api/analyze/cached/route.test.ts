import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/requireUser', () => ({
  getAuthedUser: (...args: any[]) => getAuthedUser(...args),
}));

const findFirst = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { analysis: { findFirst: (...args: any[]) => findFirst(...args) } },
}));

function makeRequest(url: string) {
  return new NextRequest(`http://localhost/api/analyze/cached?url=${encodeURIComponent(url)}`);
}

const BASE_ANALYSIS = {
  id: 'analysis-1',
  createdAt: new Date('2026-09-10T10:00:00Z'),
  isPublic: false,
  publicSlug: null,
  verdict: 'MOSTLY_TRUE',
  confidence: 72,
  scoreBreakdown: '72% overall',
  confidenceFactors: { averageSourceReliability: 80, evidenceStrengthRatio: 0.7, multiAgentAgreement: 0.6, recencyScore: 90 },
  summary: 'Analyzed 2 claims.',
  lowSourceDiversity: false,
  claims: [
    {
      claimText: 'The bill passed on Tuesday.',
      verdict: 'TRUE',
      explanation: 'Confirmed by two outlets.',
      temporalStatus: 'CURRENTLY_VALID',
      temporalAnalysis: null,
      agentAgreementScore: 0.9,
      evidence: [
        {
          sourceUrl: 'https://reuters.com/a',
          title: 'Bill passes',
          snippet: 'The bill passed.',
          fullText: null,
          publishedAt: new Date('2026-09-09T00:00:00Z'),
          stance: 'SUPPORTS',
          credibility: 'HIGH',
          credibilityScore: 90,
          source: { domain: 'reuters.com' },
        },
      ],
    },
  ],
};

describe('GET /api/analyze/cached', () => {
  beforeEach(() => {
    findFirst.mockReset();
    getAuthedUser.mockReset();
  });

  it('requires authentication', async () => {
    getAuthedUser.mockResolvedValue(null);
    const { GET } = await import('./route');
    const res = await GET(makeRequest('https://example.com/story'));
    expect(res.status).toBe(401);
  });

  it('returns no match for an invalid URL without querying the database', async () => {
    getAuthedUser.mockResolvedValue({ id: 'user-1' });
    const { GET } = await import('./route');
    const res = await GET(makeRequest('not a url'));
    const body = await res.json();
    expect(body.match).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("prefers the caller's own recent analysis over a public one", async () => {
    getAuthedUser.mockResolvedValue({ id: 'user-1' });
    findFirst.mockResolvedValueOnce({ ...BASE_ANALYSIS, id: 'own-analysis' });
    const { GET } = await import('./route');
    const res = await GET(makeRequest('https://example.com/story'));
    const body = await res.json();

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(body.match.id).toBe('own-analysis');
    expect(body.match.isOwn).toBe(true);
    expect(body.match.result.verdict).toBe('MOSTLY_TRUE');
    expect(body.match.result.claims).toHaveLength(1);
    expect(body.match.result.claims[0].evidence[0].domain).toBe('reuters.com');
  });

  it("falls back to another user's public analysis when none of the caller's own match", async () => {
    getAuthedUser.mockResolvedValue({ id: 'user-1' });
    findFirst.mockResolvedValueOnce(null); // no own match
    findFirst.mockResolvedValueOnce({ ...BASE_ANALYSIS, id: 'public-analysis', isPublic: true, publicSlug: 'abc123' });
    const { GET } = await import('./route');
    const res = await GET(makeRequest('https://example.com/story'));
    const body = await res.json();

    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(body.match.id).toBe('public-analysis');
    expect(body.match.isOwn).toBe(false);
    expect(body.match.publicSlug).toBe('abc123');
  });

  it('returns no match when neither query finds a hit', async () => {
    getAuthedUser.mockResolvedValue({ id: 'user-1' });
    findFirst.mockResolvedValue(null);
    const { GET } = await import('./route');
    const res = await GET(makeRequest('https://example.com/story'));
    const body = await res.json();
    expect(body.match).toBeNull();
  });

  it('fails soft (no match) if the database throws', async () => {
    getAuthedUser.mockResolvedValue({ id: 'user-1' });
    findFirst.mockRejectedValue(new Error('connection lost'));
    const { GET } = await import('./route');
    const res = await GET(makeRequest('https://example.com/story'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.match).toBeNull();
  });
});
