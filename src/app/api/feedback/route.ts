import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';
import { validateSameOrigin } from '@/lib/security/csrf';

export const dynamic = 'force-dynamic';

// §9.2: lets a signed-in user flag "this verdict looks wrong" on a saved
// analysis. Both a trust signal for the product and, over time, a labeled
// dataset for the confidence-calibration work described in the roadmap (§3.4).

const CreateSchema = z.object({
  analysisId: z.string().min(1),
  type: z.enum(['verdict_wrong', 'missing_context', 'source_issue', 'other']).default('verdict_wrong'),
  message: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const csrf = validateSameOrigin(req);
  if (!csrf.ok) return csrf.response!;

  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in to submit feedback.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const analysis = await prisma.analysis.findUnique({ where: { id: parsed.data.analysisId } });
  if (!analysis || (!analysis.isPublic && analysis.userId !== user.id)) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: user.id,
      analysisId: parsed.data.analysisId,
      type: parsed.data.type,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ feedback });
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const analysisId = searchParams.get('analysisId');

  const feedback = await prisma.feedback.findMany({
    where: { userId: user.id, ...(analysisId ? { analysisId } : {}) },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ feedback });
}
