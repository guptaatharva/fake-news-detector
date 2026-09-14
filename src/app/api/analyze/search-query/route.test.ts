import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: vi.fn().mockResolvedValue({ ok: true, userId: 'test-user' }),
}));

const searchWeb = vi.fn();
vi.mock('@/lib/services/search.service', () => ({
  SearchService: { searchWeb: (...args: any[]) => searchWeb(...args) },
}));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze/search-query', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/analyze/search-query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates results to one hit per domain and caps at 6', async () => {
    searchWeb.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        title: `Article ${i}`,
        sourceUrl: `https://outlet${i % 5}.example.com/story-${i}`,
        link: `https://outlet${i % 5}.example.com/story-${i}`,
        domain: `outlet${i % 5}.example.com`,
        source: `Outlet ${i % 5}`,
        snippet: 'snippet',
      })),
    );

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ claim: 'The bridge reopened after repairs.' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    const domains = json.results.map((r: any) => r.domain);
    expect(new Set(domains).size).toBe(domains.length); // no duplicate domains
    expect(json.results.length).toBeLessThanOrEqual(6);
  });

  it('excludes results from the original article\'s own domain (anti-circular-verification)', async () => {
    searchWeb.mockResolvedValue([
      { title: 'Self-referencing', sourceUrl: 'https://origin.example.com/story', domain: 'origin.example.com', source: 'Origin', snippet: '' },
      { title: 'Independent', sourceUrl: 'https://independent.example.com/story', domain: 'independent.example.com', source: 'Independent', snippet: '' },
    ]);

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ claim: 'A claim about the story.', originalUrl: 'https://origin.example.com/original-article' }),
    );
    const json = await res.json();

    expect(json.results.some((r: any) => r.domain === 'origin.example.com')).toBe(false);
    expect(json.results.some((r: any) => r.domain === 'independent.example.com')).toBe(true);
  });

  it('returns 400 for a missing/empty claim', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ claim: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 502 when no provider returns any results', async () => {
    searchWeb.mockResolvedValue([]);
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ claim: 'An unresearchable claim.' }));
    expect(res.status).toBe(502);
  });
});
