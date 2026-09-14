import { z } from 'zod';
import { nvidiaGenerateObject } from '../nvidia';
import { UNTRUSTED_CONTENT_GUARD, wrapUntrustedContent } from '../promptSafety';

export const TemporalAgentSchema = z.object({
  temporalStatus: z.enum(['CURRENTLY_VALID', 'PREVIOUSLY_TRUE_NOW_FALSE', 'FUTURE_PROJECTION', 'UNKNOWN_TIMELINE']).describe('The temporal validity of the claim.'),
  analysis: z.string().describe("Explanation of how the claim relates to the timeline of the evidence."),
});

export type TemporalAgentResult = z.infer<typeof TemporalAgentSchema>;

export async function runTemporalAgent(claim: string, evidenceContext: string, currentDate: string): Promise<TemporalAgentResult> {
  const { object } = await nvidiaGenerateObject({
    schema: TemporalAgentSchema,
    callerLabel: 'DebateTemporal',
    prompt: `You are the Temporal Agent in a multi-agent debate system. Your goal is to detect claims that were once true but are no longer, or that misrepresent old events as current — a very common misinformation pattern ("true, but from 2019, being shared as if it happened today").

Today's actual date is ${currentDate}. Use this, not your own sense of "the current year" from training, to judge whether evidence is current, historical, or (rare, and worth real scrutiny before concluding) genuinely dated in the future — a source published before today is NOT a future projection just because its date looks unfamiliar to you.

Claim: "${claim}"

${UNTRUSTED_CONTENT_GUARD}

${wrapUntrustedContent('evidence', evidenceContext)}

Analyze the publication dates or timeline mentioned in the evidence compared to the claim's implicit or explicit date.

Return ONLY raw valid JSON matching this exact structure, no markdown fences, no prose:
{
  "temporalStatus": "CURRENTLY_VALID" | "PREVIOUSLY_TRUE_NOW_FALSE" | "FUTURE_PROJECTION" | "UNKNOWN_TIMELINE",
  "analysis": "Your explanation here"
}`,
    enableThinking: false,
    maxTokens: 1024,
  });
  return object;
}
