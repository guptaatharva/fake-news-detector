import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

// Single-analysis fetch, used by the dashboard's re-check flow (§6.4) to
// prefill the original source URL/text and pass along `previousVersionId`
// when the user re-runs an existing analysis. Also generally useful as a
// detail endpoint. Ownership-checked — a caller can only fetch their own
// analyses (public ones should go through /report/[slug] instead).

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const analysis = await prisma.analysis.findUnique({ where: { id } });
  if (!analysis || analysis.userId !== user.id) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  return NextResponse.json({
    id: analysis.id,
    sourceUrl: analysis.sourceUrl,
    textContent: analysis.textContent,
    verdict: analysis.verdict,
    confidence: analysis.confidence,
    createdAt: analysis.createdAt,
  });
}
