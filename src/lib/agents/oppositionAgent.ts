import { z } from 'zod';
import { nvidiaGenerateObject } from '../nvidia';
import { UNTRUSTED_CONTENT_GUARD, wrapUntrustedContent } from '../promptSafety';

export const OppositionAgentSchema = z.object({
  contradictingArguments: z.array(z.string()).describe('List of points from the evidence that contradict or refute the claim.'),
  confidenceInOpposition: z.number().min(0).max(100).describe('Confidence level (0-100) that the evidence strongly contradicts the claim.'),
});

export type OppositionAgentResult = z.infer<typeof OppositionAgentSchema>;

export async function runOppositionAgent(claim: string, evidenceContext: string, currentDate: string): Promise<OppositionAgentResult> {
  const { object } = await nvidiaGenerateObject({
    schema: OppositionAgentSchema,
    callerLabel: 'DebateOpposition',
    prompt: `You are the Opposition Agent in a multi-agent debate system. Your goal is strictly to find and articulate evidence that CONTRADICTS or REFUTES the following claim.

Today's actual date is ${currentDate}.

Claim: "${claim}"

${UNTRUSTED_CONTENT_GUARD}

${wrapUntrustedContent('evidence', evidenceContext)}

Analyze the evidence and extract only the contradicting points. If there is no contradiction, return an empty array and 0 confidence.

Return ONLY raw valid JSON matching this exact structure, no markdown fences, no prose:
{
  "contradictingArguments": ["point 1", "point 2"],
  "confidenceInOpposition": 85
}`,
    enableThinking: false,
    maxTokens: 1024,
  });
  return object;
}
