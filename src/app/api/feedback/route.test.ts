import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetAuthedUser = vi.fn();
vi.mock('@/lib/auth/requireUser', () => ({
  getAuthedUser: () => mockGetAuthedUser(),
}));

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    analysis: { findUnique: (...args: any[]) => mockFindUnique(...args) },
    feedback: { create: (...args: any[]) => mockCreate(...args) },
  },
}));

function makeRequest(body: any) {
  return new NextRequest('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/feedback authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetAuthedUser.mockResolvedValue({ id: 'user-alice' });
    mockCreate.mockResolvedValue({ id: 'feedback-1' });
  });

  it('rejects unauthenticated users with 401', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ analysisId: 'a1' }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when analysis is private and belongs to another user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-bob',
      isPublic: false,
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ analysisId: 'a1', message: 'Wrong verdict' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Analysis not found.');
  });

  it('allows feedback when analysis belongs to the requesting user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-alice',
      isPublic: false,
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ analysisId: 'a1', message: 'I own this' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('allows feedback when analysis is public, even if owned by another user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-bob',
      isPublic: true,
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ analysisId: 'a1', message: 'Public analysis feedback' }));
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
