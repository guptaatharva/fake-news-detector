import { z } from 'zod';
import { extractTextFromUrl } from '@/lib/extractor';
import { nvidiaGenerateObject, NvidiaError } from '@/lib/nvidia';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

const RequestSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
}).refine(data => data.url || data.text, {
  message: "Either URL or text must be provided.",
});

function deduplicateClaims(rawClaims: string[]): string[] {
  const deduped: string[] = [];
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
    'just', 'should', 'now', 'that', 'this', 'these', 'those', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while'
  ]);

  const getSignificantTokens = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );
  };

  for (const raw of rawClaims) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 15) continue;

    const tokens = getSignificantTokens(trimmed);
    if (tokens.size < 3) continue;

    let isDuplicate = false;
    for (const existing of deduped) {
      if (existing.toLowerCase() === trimmed.toLowerCase()) {
        isDuplicate = true;
        break;
      }

      const existingTokens = getSignificantTokens(existing);
      let intersection = 0;
      for (const t of tokens) {
        if (existingTokens.has(t)) intersection++;
      }
      const union = new Set([...tokens, ...existingTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      const minTokens = Math.min(tokens.size, existingTokens.size);
      const overlap = minTokens > 0 ? intersection / minTokens : 0;

      if (jaccard > 0.65 || overlap > 0.85) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      deduped.push(trimmed);
    }
  }

  return deduped;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    let contentToAnalyze = result.data.text || '';

    // --- Stage 1: Extract content from URL (scraper concern) ---
    if (result.data.url) {
      try {
        let rawUrl = result.data.url.trim();
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = 'https://' + rawUrl;
        }
        console.log(`[Extract API] Starting content extraction for URL: ${rawUrl}`);
        contentToAnalyze = await extractTextFromUrl(rawUrl);
        console.log(`[Extract API] Extracted ${contentToAnalyze.length} chars from ${rawUrl}`);
      } catch (error: any) {
        // This is a SCRAPER error, not a Gemini error — handle separately
        console.error(`[Extract API] Scraper error for ${result.data.url}:`, error.message);
        return NextResponse.json(
          { error: error.message || "Failed to extract content from the provided URL." },
          { status: 422 }
        );
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length < 50) {
      return NextResponse.json({ error: "Not enough content to analyze." }, { status: 400 });
    }

    // --- Stage 2: NVIDIA Nemotron 3 Ultra claim extraction ---
    try {
      console.log(`[NeMo] [Extract] Sending ${contentToAnalyze.length} chars for claim extraction`);

      const { object: extraction, modelUsed } = await nvidiaGenerateObject({
        schema: z.object({
          claims: z.array(z.string()).describe('List of 10 to 15 distinct, atomic, verifiable factual claims.')
        }),
        prompt: `Extract 10 to 15 distinct, atomic, verifiable factual claims from the following text.
Target: 10–15 claims.

Format requirements:
Output MUST be a single, valid JSON object with the key "claims" containing an array of claim strings:
{"claims": ["claim 1", "claim 2", ...]}

Extraction guidelines:
- Each claim must be an atomic, standalone factual assertion (who did what, when, where, numbers, quotes, official actions).
- Claims must be directly grounded in the text without speculation.
- Each claim must be distinct and non-overlapping.
- Keep reasoning brief and proceed immediately to outputting the JSON object.
- Output ONLY the JSON object.

Text:
${contentToAnalyze}`,
        maxTokens: 16384,
        callerLabel: 'Extract',
      });

      const rawClaims = Array.isArray(extraction.claims) ? extraction.claims : [];
      const dedupedClaims = deduplicateClaims(rawClaims);

      console.log(`[NeMo] [Extract] Claims generated: ${rawClaims.length}`);
      console.log(`[NeMo] [Extract] Claims after deduplication: ${dedupedClaims.length}`);
      console.log(`[NeMo] [Extract] Model=${modelUsed}, returning ${dedupedClaims.length} claims`);

      return NextResponse.json({ claims: dedupedClaims, originalText: contentToAnalyze });
    } catch (aiError: any) {
      // NVIDIA / AI error — handle with specific diagnostics
      console.error('[NeMo] [Extract] Error:', aiError.message || aiError);

      const status = aiError instanceof NvidiaError ? aiError.statusCode : 500;
      const message = aiError instanceof NvidiaError
        ? aiError.message
        : 'An error occurred during AI claim extraction.';

      return NextResponse.json({ error: message }, { status });
    }
  } catch (error: any) {
    // Catch-all for unexpected errors (JSON parse, etc.)
    console.error('[Extract API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
