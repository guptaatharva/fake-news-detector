import { describe, it, expect, vi, beforeEach } from 'vitest';

const recognize = vi.fn();
vi.mock('tesseract.js', () => ({ recognize: (...args: any[]) => recognize(...args) }));

describe('extractTextFromImage', () => {
  beforeEach(() => {
    recognize.mockReset();
  });

  it('trims the recognized text and passes through confidence', async () => {
    recognize.mockResolvedValue({ data: { text: '  Hello world.  ', confidence: 87.5 } });
    const { extractTextFromImage } = await import('./ocr');
    const result = await extractTextFromImage(Buffer.from('fake-image-bytes'), 'image/png');
    expect(result.text).toBe('Hello world.');
    expect(result.confidence).toBe(87.5);
  });

  it('caps extracted text length', async () => {
    recognize.mockResolvedValue({ data: { text: 'A'.repeat(25_000), confidence: 90 } });
    const { extractTextFromImage } = await import('./ocr');
    const result = await extractTextFromImage(Buffer.from('fake'), 'image/png');
    expect(result.text.length).toBe(20_000);
  });

  it('defaults confidence to 0 when tesseract omits it', async () => {
    recognize.mockResolvedValue({ data: { text: 'Some text here.' } });
    const { extractTextFromImage } = await import('./ocr');
    const result = await extractTextFromImage(Buffer.from('fake'), 'image/png');
    expect(result.confidence).toBe(0);
  });

  it('times out rather than hanging forever on a stuck recognition', async () => {
    vi.useFakeTimers();
    try {
      recognize.mockReturnValue(new Promise(() => {})); // never resolves
      const { extractTextFromImage, OcrError } = await import('./ocr');
      const promise = extractTextFromImage(Buffer.from('fake'), 'image/png');
      const assertion = expect(promise).rejects.toBeInstanceOf(OcrError);
      await vi.advanceTimersByTimeAsync(45_001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
