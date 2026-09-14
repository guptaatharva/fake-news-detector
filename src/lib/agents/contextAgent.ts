import { z } from 'zod';
import { nvidiaGenerateObject } from '../nvidia';
import { UNTRUSTED_CONTENT_GUARD, wrapUntrustedContent } from '../promptSafety';

export const ContextAgentSchema = z.object({
  contextualFactors: z.array(z.string()).describe('List of missing background information, nuances, or misleading framing in the claim compared to the evidence.'),
  temporalRelevance: z.string().describe('Notes on recency or timeline issues (e.g., "This was true in 2020 but is false now").'),
});

export type ContextAgentResult = z.infer<typeof ContextAgentSchema>;

export async function runContextAgent(claim: string, evidenceContext: string, currentDate: string): Promise<ContextAgentResult> {
  const { object } = await nvidiaGenerateObject({
    schema: ContextAgentSchema,
    callerLabel: 'DebateContext',
    prompt: `You are the Context Agent in a multi-agent debate system. Your goal is to identify missing context, misleading framing, or temporal mismatch regarding the following claim.

Today's actual date is ${currentDate} — judge recency against that, not your own training-data sense of "now."

Claim: "${claim}"

${UNTRUSTED_CONTENT_GUARD}

${wrapUntrustedContent('evidence', evidenceContext)}

Analyze the evidence and extract contextual factors that provide nuance beyond a simple true/false.

Return ONLY raw valid JSON matching this exact structure, no markdown fences, no prose:
{
  "contextualFactors": ["factor 1", "factor 2"],
  "temporalRelevance": "notes on timeline issues if any"
}`,
    enableThinking: false,
    maxTokens: 1024,
  });
  return object;
}
