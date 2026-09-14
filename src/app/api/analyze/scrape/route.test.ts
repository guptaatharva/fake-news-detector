import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: vi.fn().mockResolvedValue({ ok: true, userId: 'test-user' }),
}));

const extractWithDiagnostics = vi.fn();
vi.mock('@/lib/extractor', () => ({
  extractWithDiagnostics: (...args: any[]) => extractWithDiagnostics(...args),
}));

const resolveGoogleNewsUrl = vi.fn();
vi.mock('@/lib/services/search.service', () => ({
  SearchService: { resolveGoogleNewsUrl: (...args: any[]) => resolveGoogleNewsUrl(...args) },
}));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze/scrape', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const okDiagnostics = (overrides: Partial<any> = {}) => ({
  text: 'A'.repeat(200),
  method: 'fetch',
  rawLength: 200,
  usedFallback: false,
  qualityOk: true,
  byline: 'Jane Reporter',
  publishedAt: '2024-01-01T00:00:00.000Z',
  paywalled: false,
  diagnostics: { url: '', finalUrl: '', httpStatus: 200, navigationDurationMs: 10, navigationTimedOut: false, extractedCharCount: 200, method: 'fetch', tiersAttempted: ['fetch'], robotsBlocked: false, error: null },
  ...overrides,
});

describe('POST /api/analyze/scrape', () => {
  beforeEach(() => {
    // clearAllMocks (not resetAllMocks) — preserves the apiGuard mock's
    // configured resolved value while wiping per-test call history.
    vi.clearAllMocks();
  });

  it('returns the scraped text, byline, and publish date on success', async () => {
    extractWithDiagnostics.mockResolvedValue(okDiagnostics());

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://news.example.com/article' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text.length).toBeGreaterThan(0);
    expect(json.byline).toBe('Jane Reporter');
    expect(json.publishedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns 422 with a paywall-specific message for paywalled content', async () => {
    extractWithDiagnostics.mockResolvedValue(
      okDiagnostics({ qualityOk: false, text: '', paywalled: true }),
    );

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://paywalled.example.com/article' }));
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toMatch(/paywall/i);
  });

  it('returns 422 when robots.txt disallows the page', async () => {
    extractWithDiagnostics.mockResolvedValue(
      okDiagnostics({ diagnostics: { ...okDiagnostics().diagnostics, robotsBlocked: true } }),
    );

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://disallowed.example.com/article' }));
    expect(res.status).toBe(422);
  });

  it('resolves a Google News intermediary URL before scraping', async () => {
    resolveGoogleNewsUrl.mockResolvedValue('https://publisher.example.com/real-article');
    extractWithDiagnostics.mockResolvedValue(okDiagnostics());

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://news.google.com/articles/abc123' }));

    expect(res.status).toBe(200);
    expect(extractWithDiagnostics).toHaveBeenCalledWith('https://publisher.example.com/real-article');
  });

  it('rejects when a Google News URL cannot be resolved to a publisher URL', async () => {
    resolveGoogleNewsUrl.mockResolvedValue(null);

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://news.google.com/articles/unresolvable' }));
    expect(res.status).toBe(422);
    expect(extractWithDiagnostics).not.toHaveBeenCalled();
  });

  it('rejects a missing url', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
