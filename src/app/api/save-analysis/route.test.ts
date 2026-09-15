import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockCreateClient = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

const mockUserUpsert = vi.fn();
const mockAnalysisCreate = vi.fn();
const mockSourceUpsert = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { upsert: (...args: any[]) => mockUserUpsert(...args) },
    analysis: { create: (...args: any[]) => mockAnalysisCreate(...args) },
    source: { upsert: (...args: any[]) => mockSourceUpsert(...args) },
  },
}));

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/save-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/save-analysis', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
    });
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: () => mockGetUser(),
      },
    });
    mockUserUpsert.mockResolvedValue({ id: 'user-123' });
    mockAnalysisCreate.mockResolvedValue({ id: 'analysis-999', isPublic: false });
    mockSourceUpsert.mockResolvedValue({ domain: 'example.com' });
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('rejects missing or malformed body with 400', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost/api/save-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{{{',
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('malformed');
  });

  it('rejects payload missing required result.verdict with 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({
        sourceUrl: 'https://example.com/article',
        result: {
          // missing verdict
          confidenceScore: 80,
        },
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid analysis payload.');
    expect(json.details.fieldErrors.result).toBeDefined();
  });

  it('successfully validates and creates analysis for valid payload', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({
        sourceUrl: 'https://example.com/article',
        textContent: 'Sample text',
        result: {
          verdict: 'MOSTLY_TRUE',
          confidenceScore: 85,
          summary: 'Verified 1 claim.',
          claims: [
            {
              claimText: 'Sample claim',
              verdict: 'TRUE',
              evidence: [
                {
                  sourceUrl: 'https://reuters.com/news',
                  domain: 'reuters.com',
                  title: 'Reuters report',
                  snippet: 'Supporting snippet',
                  stance: 'SUPPORTS',
                  credibility: 'HIGH',
                  credibilityScore: 90,
                },
              ],
            },
          ],
        },
        makePublic: false,
      })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('analysis-999');
    expect(mockAnalysisCreate).toHaveBeenCalledTimes(1);
    expect(mockSourceUpsert).toHaveBeenCalledTimes(1);
  });
});
