import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { NvidiaError } from '@/lib/nvidia';
import { runClaimDebate } from '@/lib/agents/debateOrchestrator';

export const maxDuration = 120;

// The multi-agent debate system is the core verification engine: this route
// runs Support/Opposition/Context/Temporal/Judge for ONE claim against its own
// independently-gathered evidence, and returns a deterministically-computed
// confidence score alongside the verdict (see src/lib/confidence.ts).

const EvidenceSchema = z.object({
  sourceUrl: z.string().max(2048),
  domain: z.string().max(255),
  title: z.string().max(500).default(''),
  snippet: z.string().max(2000).default(''),
  content: z.string().max(4000).default(''),
  publisher: z.string().max(255).optional(),
  publishedAt: z.string().max(64).optional(),
  hasAuthor: z.boolean().optional(),
});

const RequestSchema = z.object({
  claim: z.string().min(1).max(2000),
  evidence: z.array(EvidenceSchema).max(10).default([]),
});

export async function POST(req: NextRequest) {
  const guard = await guardApiRequest(req, { scope: 'analyze:debate', limit: 60, windowMs: 60_000, requireAuth: true });
  if (!guard.ok) return guard.response;

  const requestStartTime = Date.now();
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { claim, evidence } = parsed.data;
    console.log(`[Debate] Claim: "${claim.slice(0, 80)}..." | Sources: ${evidence.length}`);

    const result = await runClaimDebate({ claim, evidence });

    const elapsed = Date.now() - requestStartTime;
    console.log(`[Debate] Completed in ${elapsed}ms | verdict=${result.verdict} confidence=${result.confidence}`);

    return NextResponse.json(result);
  } catch (error: any) {
    const elapsed = Date.now() - requestStartTime;
    console.error(`[Debate] Error after ${elapsed}ms: ${error?.message || error}`);
    const status = error instanceof NvidiaError ? error.statusCode : 500;
    const message = error instanceof NvidiaError ? error.message : 'An error occurred during claim debate.';
    return NextResponse.json({ error: message }, { status });
  }
}
