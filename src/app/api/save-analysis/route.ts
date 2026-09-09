export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

// Reuse PrismaClient instance if possible in next
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
        confidence: result.confidenceScore,
        scoreBreakdown: result.scoreBreakdown,
        summary: result.summary,
        claims: {
          create: result.claims.map((claim: any) => ({
            claimText: claim.claimText,
            verdict: claim.verdict,
            explanation: claim.explanation,
            evidence: {
              create: claim.evidence?.map((ev: any) => ({
                sourceUrl: ev.sourceUrl || '',
                title: ev.title,
                snippet: ev.snippet,
                credibility: ev.credibility,
              })) || []
            }
          }))
        }
      }
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Failed to save analysis:', error);
    return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
  }
}
