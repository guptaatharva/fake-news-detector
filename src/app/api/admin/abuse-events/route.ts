import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';
import { isAdminUser } from '@/lib/auth/isAdmin';

export const dynamic = 'force-dynamic';

// §9.4: the review surface for src/lib/security/abuseMonitor.ts's persisted
// warnings. Gated by the ADMIN_EMAILS allowlist (see src/lib/auth/isAdmin.ts).

export async function GET() {
  const user = await getAuthedUser();
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const events = await prisma.abuseEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ events });
}
