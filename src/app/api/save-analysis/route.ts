export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

// Reuse PrismaClient instance if possible in next
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sourceUrl, textContent, result } = body;

    const analysis = await prisma.analysis.create({
      data: {
        userId: session.user.id,
        sourceUrl: sourceUrl || null,
        textContent: textContent || null,
        verdict: result.verdict,
        confidence: result.confidenceScore,
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
