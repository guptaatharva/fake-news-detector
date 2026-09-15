import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const guardApiRequest = vi.fn();
vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: (...args: any[]) => guardApiRequest(...args),
}));

describe('GET /api/news', () => {
  const originalEnv = process.env.GNEWS_API_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.GNEWS_API_KEY = 'test-gnews-key';
    guardApiRequest.mockResolvedValue({ ok: true, userId: null });
  });

  afterEach(() => {
    process.env.GNEWS_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it('rejects when rate limit is exceeded', async () => {
    guardApiRequest.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 }),
    });

    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/news');
    const res = await GET(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('Rate limit exceeded.');
  });

  it('returns 503 when GNEWS_API_KEY is not configured', async () => {
    delete process.env.GNEWS_API_KEY;

    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/news');
    const res = await GET(req);

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('not configured');
    expect(data.articles).toEqual([]);
  });

  it('handles upstream GNews API errors cleanly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Quota exceeded', { status: 429 })
    );

    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/news');
    const res = await GET(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.articles).toEqual([]);
    expect(data.error).toBe('Failed to fetch top headlines.');
  });

  it('returns articles on successful upstream response', async () => {
    const mockArticles = [
      { title: 'Headline 1', url: 'https://example.com/1' },
      { title: 'Headline 2', url: 'https://example.com/2' },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ articles: mockArticles }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost/api/news');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.articles).toHaveLength(2);
    expect(data.articles[0].title).toBe('Headline 1');
  });
});
