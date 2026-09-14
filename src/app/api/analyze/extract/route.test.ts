import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Integration test for the extract route handler itself (not just its pure
// helpers) — mocks the network/LLM boundary (auth guard, extractor, NVIDIA)
// so the route's own request-parsing, validation, and response-shaping logic
// is exercised end-to-end.

vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: vi.fn().mockResolvedValue({ ok: true, userId: 'test-user' }),
}));

const extractTextFromUrl = vi.fn();
vi.mock('@/lib/extractor', () => ({
  extractTextFromUrl: (...args: any[]) => extractTextFromUrl(...args),
}));

const nvidiaGenerateObject = vi.fn();
vi.mock('@/lib/nvidia', async () => {
  const actual = await vi.importActual<typeof import('@/lib/nvidia')>('@/lib/nvidia');
  return {
    ...actual,
    nvidiaGenerateObject: (...args: any[]) => nvidiaGenerateObject(...args),
  };
});

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/analyze/extract', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/analyze/extract', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply the guard mock after resetAllMocks clears implementations.
    // (vi.mock factories run once at module init, but the returned fns get reset.)
  });

  it('extracts and dedupes claims from submitted text', async () => {
    const { guardApiRequest } = await import('@/lib/security/apiGuard');
    (guardApiRequest as any).mockResolvedValue({ ok: true, userId: 'test-user' });
    nvidiaGenerateObject.mockResolvedValue({
      object: {
        claims: [
          'The city council approved the new budget on Tuesday.',
          'The city council approved the new budget on Tuesday.', // exact duplicate
        ],
      },
      modelUsed: 'mock-model',
    });

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ text: 'A long enough piece of text describing a news event that just happened downtown.' }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claims).toHaveLength(1);
    expect(json.originalText).toContain('downtown');
  });

  it('rejects a request with neither url nor text', async () => {
    const { guardApiRequest } = await import('@/lib/security/apiGuard');
    (guardApiRequest as any).mockResolvedValue({ ok: true, userId: 'test-user' });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('extracts from a URL via the extractor before calling the LLM', async () => {
    const { guardApiRequest } = await import('@/lib/security/apiGuard');
    (guardApiRequest as any).mockResolvedValue({ ok: true, userId: 'test-user' });
    extractTextFromUrl.mockResolvedValue('Scraped article body text that is long enough to pass validation checks easily.');
    nvidiaGenerateObject.mockResolvedValue({
      object: { claims: ['A specific verifiable factual assertion from the article.'] },
      modelUsed: 'mock-model',
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://news.example.com/article' }));
    const json = await res.json();

    expect(extractTextFromUrl).toHaveBeenCalledWith('https://news.example.com/article');
    expect(res.status).toBe(200);
    expect(json.claims).toHaveLength(1);
  });

  it('returns a 422 when the URL cannot be scraped', async () => {
    const { guardApiRequest } = await import('@/lib/security/apiGuard');
    (guardApiRequest as any).mockResolvedValue({ ok: true, userId: 'test-user' });
    extractTextFromUrl.mockRejectedValue(new Error('Unable to extract meaningful article content from this URL.'));

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ url: 'https://unscrapable.example.com/article' }));
    expect(res.status).toBe(422);
  });

  it('propagates the guard rejection (e.g. rate limit) without running the pipeline', async () => {
    const { guardApiRequest } = await import('@/lib/security/apiGuard');
    const { NextResponse } = await import('next/server');
    (guardApiRequest as any).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 }),
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ text: 'Some text.' }));
    expect(res.status).toBe(429);
    expect(nvidiaGenerateObject).not.toHaveBeenCalled();
  });
});
