import { z } from 'zod';
import { extractTextFromUrl } from '@/lib/extractor';
import { geminiGenerateObject, GeminiError } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; 

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

    // --- Stage 2: Gemini AI claim extraction (AI concern) ---
    try {
      console.log(`[Extract API] Sending ${contentToAnalyze.length} chars to Gemini for claim extraction`);

      const { object: extraction, modelUsed, usedFallback } = await geminiGenerateObject({
        schema: z.object({
          claims: z.array(z.string()).describe('List of 10 to 15 distinct, atomic, verifiable factual claims.')
        }),
        prompt: `Extract 10 to 15 distinct, atomic, verifiable factual claims from the following text.
Whenever the submitted text contains enough factual information, you MUST produce at least 10 claims (target: 10–15).

IMPORTANT INSTRUCTIONS:
- You must return ONLY raw valid JSON strictly matching the schema: {"claims": [...]}.
- Do NOT simply split sentences mechanically.
- Decompose the text into atomic, specific, independently verifiable factual assertions such as:
  * Who did what (key actors, subjects, persons)
  * When it happened (dates, times, sequence)
  * Where it happened (locations, jurisdictions)
  * What was announced or stated (direct quotes, official announcements)
  * What organizations, companies, or institutions were involved
  * What numbers, statistics, metrics, or financial figures were reported
  * What official actions, policies, legal measures, or sanctions were taken
  * What consequences, results, or outcomes were reported
- Distinctness: Every claim MUST be unique and distinct from the others. Do NOT produce variations or rewordings of the same fact.
- Groundedness: Claims MUST be grounded ONLY in the submitted text. Do NOT extrapolate, speculate, or fabricate facts.
- If the source text genuinely contains fewer than 10 independently verifiable assertions, return the maximum number supported by the text. But for normal news articles, target 10 to 15 claims.
- ENSURE you close all brackets and braces. Your response MUST end with a closing brace "}".

      Text: ${contentToAnalyze}`,
        thinkingLevel: 'medium',
        callerLabel: 'Extract',
      });

      const rawClaims = Array.isArray(extraction.claims) ? extraction.claims : [];
      const dedupedClaims = deduplicateClaims(rawClaims);

      console.log(`[Extract] Claims generated: ${rawClaims.length}`);
      console.log(`[Extract] Claims after deduplication: ${dedupedClaims.length}`);
      console.log(
        `[Extract API] Model=${modelUsed}, fallback=${usedFallback}, returning ${dedupedClaims.length} claims`
      );

      return NextResponse.json({ claims: dedupedClaims, originalText: contentToAnalyze });
    } catch (geminiError: any) {
      // This is a GEMINI/AI error — handle with AI-specific diagnostics
      console.error('[Extract API] Gemini error:', geminiError.message || geminiError);
      
      const status = geminiError instanceof GeminiError ? geminiError.statusCode : 500;
      const message = geminiError instanceof GeminiError
        ? geminiError.message
        : 'An error occurred during AI claim extraction.';

      return NextResponse.json({ error: message }, { status });
    }
  } catch (error: any) {
    // Catch-all for unexpected errors (JSON parse, etc.)
    console.error('[Extract API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
