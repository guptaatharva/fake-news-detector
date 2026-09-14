export const maxDuration = 60;
import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { extractTextFromImage, OcrError } from '@/lib/ocr';

// Powers the "SCREENSHOT UPLOAD" flow: OCRs an uploaded image and hands the
// recognized text back to the client, which drops it into the same
// paste-text input the "Paste Text" tab already uses — /api/analyze/extract
// and everything downstream of it is completely unchanged. This route's only
// job is turning an image into text; it says nothing about whether the
// image itself is authentic (see src/lib/ocr.ts).

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — generous for a phone/desktop screenshot
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

/**
 * Identifies the image format from its leading bytes rather than trusting
 * the client-declared MIME type, which is trivially spoofable.
 */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, { scope: 'analyze:extract-image', limit: 8, windowMs: 60_000, requireAuth: true });
  if (!guard.ok) return guard.response;

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength && contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `Image too large — max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.` }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `Image too large — max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.` }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageMime(buffer);
    if (!sniffed || !ALLOWED_MIME_TYPES.has(sniffed)) {
      return NextResponse.json({ error: 'Unsupported or unrecognized image format. Use PNG, JPEG, or WebP.' }, { status: 415 });
    }

    console.log(`[OCR API] Running OCR on a ${sniffed} image (${buffer.length} bytes)`);
    const { text, confidence } = await extractTextFromImage(buffer, sniffed);
    console.log(`[OCR API] Extracted ${text.length} chars at ${confidence.toFixed(1)}% confidence`);

    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: 'Could not read enough text from this image. Try a clearer or higher-resolution screenshot.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ text, confidence });
  } catch (error: any) {
    console.error('[OCR API] Error:', error?.message || error);
    const status = error instanceof OcrError ? 422 : 500;
    return NextResponse.json({ error: error?.message || 'Failed to read text from the uploaded image.' }, { status });
  }
}
