import { z } from 'zod';
import { extractTextFromUrl } from '@/lib/extractor';
import { nvidiaGenerateObject, NvidiaError } from '@/lib/nvidia';
import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { UnsafeUrlError } from '@/lib/security/ssrf';
import { deduplicateClaims } from '@/lib/claimDedup';
import { recordSubmissionAndCheckAbuse, logAbuseEvent } from '@/lib/security/abuseMonitor';

export const maxDuration = 300;

// Request body size caps (§2.5): a multi-megabyte `text` payload otherwise goes
// straight into an LLM prompt at full cost, and an unbounded `url` string is
// free-form attacker input.
const RequestSchema = z.object({
  url: z.string().max(2048).optional(),
  text: z.string().max(50_000).optional(),
}).refine(data => data.url || data.text, {
  message: "Either URL or text must be provided.",
});

export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, { scope: 'analyze:extract', limit: 12, windowMs: 60_000, requireAuth: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    // §9.4: monitoring-only — logs + persists a warning on repeated identical
    // submissions from the same identity, doesn't block the request.
    if (guard.userId) {
      const abuseCheck = recordSubmissionAndCheckAbuse(guard.userId, result.data.url || result.data.text || '');
      if (abuseCheck.isAbusive) {
        void logAbuseEvent(
          guard.userId,
          'analyze:extract',
          'Same content resubmitted repeatedly in a short window',
          abuseCheck.occurrences,
        );
      }
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
        // This is a SCRAPER error, not an LLM error — handle separately
        console.error(`[Extract API] Scraper error for ${result.data.url}:`, error.message);
        const status = error instanceof UnsafeUrlError ? 400 : 422;
        return NextResponse.json(
          { error: error.message || "Failed to extract content from the provided URL." },
          { status }
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
