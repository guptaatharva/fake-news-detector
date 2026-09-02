import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { extractTextFromUrl } from '@/lib/extractor';
import { NextRequest, NextResponse } from 'next/server';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const maxDuration = 60; 

const RequestSchema = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
}).refine(data => data.url || data.text, {
  message: "Either URL or text must be provided.",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = RequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    let contentToAnalyze = result.data.text || '';

    if (result.data.url) {
      try {
        let rawUrl = result.data.url.trim();
        if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
          rawUrl = 'https://' + rawUrl;
        }
        contentToAnalyze = await extractTextFromUrl(rawUrl);
      } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to extract content from the provided URL." }, { status: 400 });
      }
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length < 50) {
      return NextResponse.json({ error: "Not enough content to analyze." }, { status: 400 });
    }

    const { object: extraction } = await generateObject({
      model: google('gemini-3.7-flash'),
      providerOptions: {
        google: {
          thinkingLevel: 'medium'
        }
      },
      schema: z.object({
        claims: z.array(z.string()).describe('Top 5 most important factual claims from the text.')
      }),
      prompt: `Extract the top 1 to 5 most important verifiable factual claims from the following text.
      
IMPORTANT INSTRUCTIONS:
- You must return ONLY raw valid JSON. Do not include markdown formatting like \`\`\`json.
- Each claim MUST be completely unique and distinct from the others. Do not repeat the same claim or extract highly similar claims.
- You MUST strictly follow this exact JSON structure:
{
  "claims": [
    "First specific factual claim extracted from the text.",
    "Second specific factual claim extracted from the text."
  ]
}
- ENSURE you close all brackets and braces. Your response MUST end with a closing brace "}".

      Text: ${contentToAnalyze}`
    });

    return NextResponse.json({ claims: extraction.claims, originalText: contentToAnalyze });
  } catch (error: any) {
    console.error('Error during extraction:', error);
    
    let status = 500;
    let message = 'An error occurred during extraction.';

    if (error && typeof error === 'object') {
      const actualError = error.lastError || error;
      const statusCode = actualError.statusCode || actualError.status;
      if (statusCode) {
        status = statusCode;
        if (statusCode === 401) message = "Gemini API authentication failed. Please verify API key.";
        else if (statusCode === 403) message = "Gemini API permission denied. Please verify configuration.";
        else if (statusCode === 404) message = "The requested Gemini model was not found.";
        else if (statusCode === 410) message = "The requested Gemini model has been retired (410 Gone).";
        else if (statusCode === 429) message = "Gemini API rate limit exceeded. Please try again later.";
        else if (statusCode === 500) message = "Gemini API experienced an internal server error.";
        else message = `Gemini API encountered an error (${statusCode}).`;
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
