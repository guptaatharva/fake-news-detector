import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

// §8.4: lets a signed-in user generate a public, read-only link to a saved
// analysis so a verification can be shared directly, alongside the existing
// PDF export — a core viral-correction use case for a fact-checker.

function makePublicSlug(): string {
  return crypto.randomBytes(9).toString('base64url');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const analysis = await prisma.analysis.findUnique({ where: { id } });
  if (!analysis || analysis.userId !== user.id) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  const publicSlug = analysis.publicSlug || makePublicSlug();
  const updated = await prisma.analysis.update({
    where: { id },
    data: { isPublic: true, publicSlug },
  });

  return NextResponse.json({ publicSlug: updated.publicSlug, isPublic: updated.isPublic });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const analysis = await prisma.analysis.findUnique({ where: { id } });
  if (!analysis || analysis.userId !== user.id) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  await prisma.analysis.update({ where: { id }, data: { isPublic: false } });
  return NextResponse.json({ success: true });
}
