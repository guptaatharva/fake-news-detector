import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject } from 'ai';
import { z } from 'zod';
import { extractTextFromUrl } from '@/lib/extractor';
import { NextRequest, NextResponse } from 'next/server';

const nvidia = createOpenAICompatible({
  name: 'nvidia',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
  },
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
      model: nvidia('meta/llama-3.1-70b-instruct'),
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

      Text: ${contentToAnalyze}`
    });

    return NextResponse.json({ claims: extraction.claims, originalText: contentToAnalyze });
  } catch (error) {
    console.error('Error during extraction:', error);
    return NextResponse.json({ error: 'An error occurred during extraction.' }, { status: 500 });
  }
}
