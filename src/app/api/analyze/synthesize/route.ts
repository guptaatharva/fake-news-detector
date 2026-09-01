import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const nvidia = createOpenAICompatible({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
  },
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { originalText, evidenceContext } = await req.json();

    if (!originalText || !evidenceContext) {
      return NextResponse.json({ error: "Missing text or evidence context." }, { status: 400 });
    }

    const { object } = await generateObject({
      model: nvidia('nvidia/llama-3.1-nemotron-70b-instruct'),
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
      prompt: `You are an expert fact-checker and journalist. Analyze the following news article or text for factual accuracy based ONLY on the provided scraped evidence. 

IMPORTANT INSTRUCTIONS:
- You must return ONLY raw valid JSON. Do not include markdown formatting like \`\`\`json.
- All 'verdict' fields MUST be strictly uppercase, chosen from: "TRUE", "MOSTLY_TRUE", "MIXTURE", "MOSTLY_FALSE", "FALSE", "UNVERIFIABLE".
- All 'credibility' fields MUST be strictly uppercase, chosen from: "HIGH", "MEDIUM", "LOW".

You MUST strictly follow this exact JSON structure:
{
  "verdict": "TRUE",
  "confidenceScore": 85,
  "scoreBreakdown": "The score of 85 was achieved because 2 of the 3 claims were fully verified by high credibility sources, but one claim lacked sufficient evidence, resulting in a 15 point deduction.",
  "summary": "Short explanation of the overall verdict.",
  "claims": [
    {
      "claimText": "Exact quote or claim from the text.",
      "verdict": "FALSE",
      "explanation": "Explanation for why this specific claim is false.",
      "evidence": [
        {
          "sourceUrl": "https://example.com/source",
          "title": "Source Title",
          "snippet": "Relevant snippet from source.",
          "credibility": "HIGH"
        }
      ]
  ]
}

ENSURE you close all brackets and braces. Your response MUST end with a closing brace "}".

Text to analyze:
${originalText}

Scraped Web Evidence to Base Your Verdict On:
${evidenceContext}`,
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Error during synthesis:', error);
    
    let status = 500;
    let message = 'An error occurred during synthesis.';

    if (error && typeof error === 'object') {
      const actualError = error.lastError || error;
      const statusCode = actualError.statusCode || actualError.status;
      if (statusCode) {
        status = statusCode;
        if (statusCode === 401) message = "NVIDIA API authentication failed. Please verify API key.";
        else if (statusCode === 404) message = "The requested AI model was not found.";
        else if (statusCode === 410) message = "The requested AI model has been retired (410 Gone).";
        else if (statusCode === 429) message = "NVIDIA API rate limit exceeded. Please try again later.";
        else if (statusCode === 500) message = "NVIDIA API experienced an internal server error.";
        else message = `NVIDIA API encountered an error (${statusCode}).`;
      } else if (actualError.name?.includes('Timeout') || actualError.message?.toLowerCase().includes('timeout')) {
        status = 504;
        message = "The AI request timed out. Please try again.";
      } else if (actualError.name?.includes('ValidationError') || actualError.name?.includes('ParseError') || actualError.name?.includes('NoObjectGeneratedError')) {
        message = "The AI model returned an invalid response format.";
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
