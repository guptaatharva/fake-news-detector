export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure the user exists in Prisma database for foreign key relation
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.username ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
      },
    });

    const body = await req.json();
    const { sourceUrl, textContent, result } = body;

    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        sourceUrl: sourceUrl || null,
        textContent: textContent || null,
        verdict: result.verdict,
        confidence: Number(result.confidenceScore) || 0,
        scoreBreakdown: result.scoreBreakdown || null,
        summary: result.summary || '',
        claims: {
          create: (result.claims || []).map((claim: any) => ({
            claimText: claim.claimText || claim.text || '',
            verdict: claim.verdict || 'UNVERIFIED',
            evidence: {
              create: (claim.evidence || []).map((ev: any) => ({
                sourceUrl: ev.sourceUrl || ev.url || '',
                title: ev.title || 'Source Reference',
                snippet: ev.snippet || '',
                credibility: ev.credibility || 'HIGH',
              }))
            }
          }))
        }
      }
    });

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('[Save Analysis API] Database error:', error?.message || error);
    return NextResponse.json(
      { error: 'Could not save analysis to database history at this time.' },
      { status: 503 }
    );
  }
}
