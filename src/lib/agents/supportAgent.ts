import { z } from 'zod';
import { nvidiaGenerateObject } from '../nvidia';
import { UNTRUSTED_CONTENT_GUARD, wrapUntrustedContent } from '../promptSafety';

export const SupportAgentSchema = z.object({
  supportingArguments: z.array(z.string()).describe('List of points from the evidence that support the claim.'),
  confidenceInSupport: z.number().min(0).max(100).describe('Confidence level (0-100) that the evidence strongly supports the claim.'),
});

export type SupportAgentResult = z.infer<typeof SupportAgentSchema>;

export async function runSupportAgent(claim: string, evidenceContext: string, currentDate: string): Promise<SupportAgentResult> {
  const { object } = await nvidiaGenerateObject({
    schema: SupportAgentSchema,
    callerLabel: 'DebateSupport',
    prompt: `You are the Support Agent in a multi-agent debate system. Your goal is strictly to find and articulate evidence that SUPPORTS the following claim.

Today's actual date is ${currentDate}.

Claim: "${claim}"

${UNTRUSTED_CONTENT_GUARD}

${wrapUntrustedContent('evidence', evidenceContext)}

Analyze the evidence and extract only the supporting points. If there is no support, return an empty array and 0 confidence.

Return ONLY raw valid JSON matching this exact structure, no markdown fences, no prose:
{
  "supportingArguments": ["point 1", "point 2"],
  "confidenceInSupport": 85
}`,
    // Mechanical extraction, not deep reasoning — thinking mode is pure
    // latency overhead here across the (up to) 15 claims a single analysis
    // runs this call for.
    enableThinking: false,
    maxTokens: 1024,
  });
  return object;
}
