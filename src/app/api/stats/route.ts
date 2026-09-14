import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/requireUser';
import { computeUserStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

// §6.5: a lightweight user-facing aggregate stats endpoint — total analyses
// run, verdict distribution, and most-checked domains — both for user
// engagement and as a cheap abuse/monitoring signal for the team.

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const stats = await computeUserStats(user.id);
  return NextResponse.json(stats);
}
