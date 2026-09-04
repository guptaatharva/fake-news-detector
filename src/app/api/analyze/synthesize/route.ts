import { z } from 'zod';
import { nvidiaGenerateObject, NvidiaError } from '@/lib/nvidia';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  try {
    const { originalText, evidenceContext } = await req.json();

    if (!originalText || !evidenceContext) {
      return NextResponse.json({ error: "Missing text or evidence context." }, { status: 400 });
    }

    // Count sources in evidence context
    const sourceMatches = (evidenceContext as string).match(/--- Source \d+:|Source \[|Publisher:/gi);
    const sourceCount = sourceMatches ? sourceMatches.length : (evidenceContext.length > 0 ? 1 : 0);
    const totalChars = (originalText as string).length + (evidenceContext as string).length;

    console.log(`[NeMo] [Synthesize] Sources: ${sourceCount}`);
    console.log(`[NeMo] [Synthesize] Input characters: ${totalChars}`);
    console.log(`[NeMo] [Synthesize] Starting request`);

    const { object, modelUsed, diagnostics } = await nvidiaGenerateObject({
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
            publisher: z.string().optional().describe('Name of the publisher or news organization (e.g., Times of India, Reuters).'),
            summary: z.string().optional().describe('A short 1-2 sentence factual summary of this actual article/source (approx 25-40 words) based strictly on the scraped content.'),
            snippet: z.string().describe('A relevant quote or snippet from the source.'),
            credibility: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('Credibility of this source.')
          })).optional().describe('List of evidence supporting the verdict.')
        })).describe('List of specific claims extracted from the article and evaluated.')
      }),
      prompt: `You are an expert fact-checker and journalist. Analyze the following claims/text for factual accuracy based ONLY on the provided scraped evidence.

Return ONLY a single valid, well-formed JSON object matching the schema below. No prose, no markdown code fences.

Schema:
{
  "verdict": "TRUE"|"MOSTLY_TRUE"|"MIXTURE"|"MOSTLY_FALSE"|"FALSE"|"UNVERIFIABLE",
  "confidenceScore": <number 0-100>,
  "scoreBreakdown": "<string>",
  "summary": "<string>",
  "claims": [
    {
      "claimText": "<string>",
      "verdict": "TRUE"|"MOSTLY_TRUE"|"MIXTURE"|"MOSTLY_FALSE"|"FALSE"|"UNVERIFIABLE",
      "explanation": "<string>",
      "evidence": [
        {
          "sourceUrl": "<exact publisher URL>",
          "title": "<string>",
          "publisher": "<publisher name e.g. Times of India>",
          "summary": "<1-2 sentence concise factual summary of this source article, approx 25-40 words, strictly from the scraped content>",
          "snippet": "<string>",
          "credibility": "HIGH"|"MEDIUM"|"LOW"
        }
      ]
    }
  ]
}

RULES:
- All "verdict" values MUST be uppercase from the exact list: TRUE, MOSTLY_TRUE, MIXTURE, MOSTLY_FALSE, FALSE, UNVERIFIABLE.
- All "credibility" values MUST be uppercase: HIGH, MEDIUM, LOW.
- For each claim's evidence, "sourceUrl" MUST be the exact publisher URL (e.g. https://www.reuters.com/...) as provided in the Scraped Web Evidence. NEVER use Google News intermediary URLs or search engine URLs.
- "summary" for each evidence item MUST be a short 1–2 sentence factual summary of what THAT actual source article reports (approximately 25–40 words), derived strictly from the provided scraped content. Do NOT invent facts.
- Base your analysis ONLY on the provided evidence below.
- Ensure all string values are properly escaped with no raw unescaped newlines.

Text / Claims to analyze:
${originalText}

Scraped Web Evidence:
${evidenceContext}`,
      maxTokens: 16384,
      callerLabel: 'Synthesize',
    });

    const elapsed = Date.now() - requestStartTime;
    console.log(`[NeMo] [Synthesize] Completed in ${elapsed}ms`);
    if (diagnostics) {
      console.log(
        `[NeMo] [Synthesize] Diagnostics: content_len=${diagnostics.contentLength}, reasoning_len=${diagnostics.reasoningContentLength}, finish_reason=${diagnostics.finishReason}, startsWithBrace=${diagnostics.startsWithBrace}, endsWithBrace=${diagnostics.endsWithBrace}`
      );
    }
    console.log(
      `[Synthesize API] Verdict=${object.verdict} confidence=${object.confidenceScore}` +
      ` (model=${modelUsed})`
    );

    return NextResponse.json(object);
  } catch (error: any) {
    const elapsed = Date.now() - requestStartTime;
    if (error?.message?.toLowerCase().includes('timeout') || error?.statusCode === 504) {
      console.error(`[NeMo] [Synthesize] Timeout after ${elapsed}ms`);
    } else {
      console.error(`[NeMo] [Synthesize] Error after ${elapsed}ms: ${error?.message || error}`);
    }

    const status = error instanceof NvidiaError ? error.statusCode : 500;
    const message = error instanceof NvidiaError
      ? error.message
      : 'An error occurred during synthesis.';

    return NextResponse.json({ error: message }, { status });
  }
}

