import { z } from 'zod';
import { geminiGenerateObject, GeminiError } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  try {
    const { originalText, evidenceContext } = await req.json();

    if (!originalText || !evidenceContext) {
      return NextResponse.json({ error: "Missing text or evidence context." }, { status: 400 });
    }

    // Count sources in evidence context (e.g., markers like "Source [" or "Source:")
    const sourceMatches = (evidenceContext as string).match(/--- Source \d+:|Source \[|Publisher:/gi);
    const sourceCount = sourceMatches ? sourceMatches.length : (evidenceContext.length > 0 ? 1 : 0);
    const totalChars = (originalText as string).length + (evidenceContext as string).length;

    console.log(`[Gemini] [Synthesize] Input sources: ${sourceCount}`);
    console.log(`[Gemini] [Synthesize] Input characters: ${totalChars}`);
    console.log(`[Gemini] [Synthesize] Starting request...`);

    const { object, modelUsed, usedFallback } = await geminiGenerateObject({
      schema: z.object({
        verdict: z.enum(['TRUE', 'MOSTLY_TRUE', 'MIXTURE', 'MOSTLY_FALSE', 'FALSE', 'UNVERIFIABLE']).describe('The overall verdict of the article.'),
        confidenceScore: z.number().min(0).max(100).describe('Confidence score from 0 to 100 representing how confident you are in the overall verdict.'),
        scoreBreakdown: z.string().describe('Detailed explanation of how the confidence score was calculated, including supporting factors and deduction reasons.'),
        summary: z.string().describe('A 2-3 sentence summary explaining the overall verdict.'),
        claims: z.array(z.object({
          claimText: z.string().describe('A specific factual claim made in the text.'),
          verdict: z.enum(['TRUE', 'MOSTLY_TRUE', 'MIXTURE', 'MOSTLY_FALSE', 'FALSE', 'UNVERIFIABLE']).describe('The verdict for this specific claim.'),
          explanation: z.string().describe('Brief explanation of why this claim received its verdict based on the evidence.'),
          evidence: z.array(z.object({
            sourceUrl: z.string().describe('URL to a credible source verifying or debunking the claim. Can be empty string if unavailable.'),
            title: z.string().describe('Title or brief description of the source.'),
            snippet: z.string().describe('A relevant quote or snippet from the source.'),
            credibility: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Credibility of this source.')
          })).optional().describe('List of evidence supporting the verdict.')
        })).describe('List of specific claims extracted from the article and evaluated.')
      }),
      prompt: `You are an expert fact-checker and journalist. Analyze the following claims/text for factual accuracy based ONLY on the provided scraped evidence. 

IMPORTANT INSTRUCTIONS:
- You must return ONLY raw valid JSON matching the schema.
- All 'verdict' fields MUST be strictly uppercase, chosen from: "TRUE", "MOSTLY_TRUE", "MIXTURE", "MOSTLY_FALSE", "FALSE", "UNVERIFIABLE".
- All 'credibility' fields MUST be strictly uppercase, chosen from: "HIGH", "MEDIUM", "LOW".
- For each claim's evidence, 'sourceUrl' MUST strictly be the exact publisher URL (e.g. https://www.reuters.com/... or https://www.bbc.com/...) as provided in the Scraped Web Evidence. NEVER use Google News intermediary URLs or search engine URLs.

Text / Claims to analyze:
${originalText}

Scraped Web Evidence to Base Your Verdict On:
${evidenceContext}`,
      thinkingLevel: 'low',
      timeoutMs: 90_000,
      callerLabel: 'Synthesize',
    });

    const elapsed = Date.now() - requestStartTime;
    console.log(`[Gemini] [Synthesize] Request completed in ${elapsed}ms`);
    console.log(
      `[Synthesize API] Verdict=${object.verdict} confidence=${object.confidenceScore}` +
      ` (model=${modelUsed}, fallback=${usedFallback})`
    );

    return NextResponse.json(object);
  } catch (error: any) {
    const elapsed = Date.now() - requestStartTime;
    if (error?.message?.toLowerCase().includes('timeout') || error?.statusCode === 504) {
      console.error(`[Gemini] [Synthesize] Timeout after ${elapsed}ms`);
    } else {
      console.error(`[Gemini] [Synthesize] Error after ${elapsed}ms: ${error?.message || error}`);
    }
    
    const status = error instanceof GeminiError ? error.statusCode : 500;
    const message = error instanceof GeminiError
      ? error.message
      : 'An error occurred during synthesis.';

    return NextResponse.json({ error: message }, { status });
  }
}
