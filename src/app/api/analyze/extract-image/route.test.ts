import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/security/apiGuard', () => ({
  guardApiRequest: vi.fn().mockResolvedValue({ ok: true, userId: 'test-user' }),
}));

const extractTextFromImage = vi.fn();
vi.mock('@/lib/ocr', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ocr')>('@/lib/ocr');
  return { ...actual, extractTextFromImage: (...args: any[]) => extractTextFromImage(...args) };
});

// Valid PNG magic bytes so the route's own signature-sniffing accepts it.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function makeImageFile(bytes: Buffer, name = 'screenshot.png', type = 'image/png') {
  return new File([Uint8Array.from(bytes)], name, { type });
}

function makeRequest(formData: FormData) {
  return new NextRequest('http://localhost/api/analyze/extract-image', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/analyze/extract-image', () => {
  beforeEach(() => {
    extractTextFromImage.mockReset();
  });

  it('propagates the guard rejection (e.g. unauthenticated) without running OCR', async () => {
    const { guardApiRequest } = await import('@/lib/security/apiGuard');
    const { NextResponse } = await import('next/server');
    (guardApiRequest as any).mockResolvedValueOnce({
      ok: false,
      response: NextResponse.json({ error: 'You must be signed in.' }, { status: 401 }),
    });

    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('image', makeImageFile(PNG_SIGNATURE));
    const res = await POST(makeRequest(formData));

    expect(res.status).toBe(401);
    expect(extractTextFromImage).not.toHaveBeenCalled();
  });

  it('rejects when no image file is provided', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest(new FormData()));
    expect(res.status).toBe(400);
  });

  it('rejects an oversized image', async () => {
    const { POST } = await import('./route');
    const bigBuffer = Buffer.concat([PNG_SIGNATURE, Buffer.alloc(9 * 1024 * 1024)]);
    const formData = new FormData();
    formData.append('image', makeImageFile(bigBuffer));
    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(413);
    expect(extractTextFromImage).not.toHaveBeenCalled();
  });

  it('rejects a file whose content does not match a supported image signature, even if labeled as one', async () => {
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('image', makeImageFile(Buffer.from('this is plain text, not image bytes'), 'fake.png', 'image/png'));
    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(415);
    expect(extractTextFromImage).not.toHaveBeenCalled();
  });

  it('returns the extracted text and confidence on success', async () => {
    extractTextFromImage.mockResolvedValue({ text: 'A'.repeat(50), confidence: 91.2 });
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('image', makeImageFile(PNG_SIGNATURE));
    const res = await POST(makeRequest(formData));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.text).toHaveLength(50);
    expect(json.confidence).toBeCloseTo(91.2);
  });

  it('returns 422 when too little text was recognized', async () => {
    extractTextFromImage.mockResolvedValue({ text: 'short', confidence: 40 });
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('image', makeImageFile(PNG_SIGNATURE));
    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(422);
  });

  it('maps an OcrError (e.g. timeout) to a 422', async () => {
    const { OcrError } = await import('@/lib/ocr');
    extractTextFromImage.mockRejectedValue(new OcrError('OCR timed out.'));
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('image', makeImageFile(PNG_SIGNATURE));
    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(422);
  });

  it('maps an unexpected error to a 500', async () => {
    extractTextFromImage.mockRejectedValue(new Error('boom'));
    const { POST } = await import('./route');
    const formData = new FormData();
    formData.append('image', makeImageFile(PNG_SIGNATURE));
    const res = await POST(makeRequest(formData));
    expect(res.status).toBe(500);
  });
});
