// src/lib/ocr.ts
//
// Extracts text from an uploaded screenshot via Tesseract.js — a local,
// WASM-based OCR engine (no API key, no per-request cost, no external
// service call). The extracted text is handed to the exact same claim
// extraction pipeline text-paste mode already uses; this module only turns
// pixels into text.
//
// One real external dependency worth being explicit about: unless a local
// `langPath` is configured, Tesseract.js fetches the English trained-data
// model (~4MB, open-source, no auth) from the jsDelivr CDN the first time
// OCR runs in a given environment, then caches it. That's a one-time model
// download, not a per-analysis network call.
//
// OCR gets you the *text* visible in an image. It says nothing about
// whether the image itself is real, unaltered, or used in its original
// context — that's a separate, harder problem (reverse image search /
// manipulation detection) tracked as still-open in REMAINING.md.
import { recognize } from 'tesseract.js';
import path from 'path';
import fs from 'fs';

const OCR_TIMEOUT_MS = 45_000;
const MAX_OCR_TEXT_LENGTH = 20_000; // matches the extract route's own text-length ceiling

export interface OcrResult {
  /** Recognized text, trimmed and length-capped. */
  text: string;
  /** Tesseract's own mean confidence for the recognition, 0-100. */
  confidence: number;
}

export class OcrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrError';
  }
}

/** Runs OCR on an image buffer. `mimeType` must be one the caller has already validated. */
export async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<OcrResult> {
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  const options: Record<string, any> = {
    // Prevent unhandled worker thread exceptions from crashing Node process on corrupt images
    errorHandler: (err: any) => {
      console.warn('[OCR] Worker warning/error:', err?.message || err);
    },
  };

  // If local traineddata exists in the repo root, tell Tesseract.js to load from disk
  // rather than fetching from the jsDelivr CDN.
  const localModelPath = path.join(process.cwd(), 'eng.traineddata');
  if (fs.existsSync(localModelPath)) {
    options.langPath = process.cwd();
  }

  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new OcrError('OCR timed out — the image may be too large or complex to process.')), OCR_TIMEOUT_MS);
  });

  const recognizePromise = recognize(dataUrl, 'eng', options);

  try {
    const { data } = await Promise.race([recognizePromise, timeoutPromise]);

    const text = (data?.text || '').trim().slice(0, MAX_OCR_TEXT_LENGTH);
    const confidence = typeof data?.confidence === 'number' ? data.confidence : 0;

    return { text, confidence };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

