import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

// Finishes the previously-unused Bookmark model (§6.1): "save this analysis
// for later" is an obviously useful feature for a fact-checking tool that was
// defined in the schema but had no API route or UI anywhere.

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    include: { analysis: { select: { id: true, verdict: true, confidence: true, summary: true, sourceUrl: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ bookmarks });
}

const CreateSchema = z.object({ analysisId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'A valid analysisId is required.' }, { status: 400 });

  const analysis = await prisma.analysis.findUnique({ where: { id: parsed.data.analysisId } });
  if (!analysis || analysis.userId !== user.id) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  const bookmark = await prisma.bookmark.upsert({
    where: { userId_analysisId: { userId: user.id, analysisId: parsed.data.analysisId } },
    update: {},
    create: { userId: user.id, analysisId: parsed.data.analysisId },
  });

  return NextResponse.json({ bookmark });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const analysisId = searchParams.get('analysisId');
  if (!analysisId) return NextResponse.json({ error: 'analysisId is required.' }, { status: 400 });

  await prisma.bookmark.deleteMany({ where: { userId: user.id, analysisId } });
  return NextResponse.json({ success: true });
}
