export const dynamic = 'force-dynamic';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { normalizeUrlForDedup } from '@/lib/normalizeUrl';

function makePublicSlug(): string {
  return crypto.randomBytes(9).toString('base64url');
}

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
    const { sourceUrl, textContent, result, previousVersionId, makePublic } = body;

    // Every domain that contributed at least one piece of evidence to any claim.
    const allDomains = new Set<string>();
    for (const claim of result.claims || []) {
      for (const ev of claim.evidence || []) {
        const domain = ev.domain || (() => {
          try { return new URL(ev.sourceUrl || ev.url || '').hostname.replace(/^www\./, ''); } catch { return null; }
        })();
        if (domain) allDomains.add(domain);
      }
    }

    const analysis = await prisma.analysis.create({
      data: {
        userId: user.id,
        sourceUrl: sourceUrl || null,
        normalizedSourceUrl: sourceUrl ? normalizeUrlForDedup(sourceUrl) : null,
        textContent: textContent || null,
        verdict: result.verdict,
        confidence: Number(result.confidenceScore) || 0,
        scoreBreakdown: result.scoreBreakdown || null,
        confidenceFactors: result.confidenceFactors ?? undefined,
        sourceCount: allDomains.size,
        lowSourceDiversity: Boolean(result.lowSourceDiversity),
        summary: result.summary || '',
        previousVersionId: previousVersionId || null,
        isPublic: Boolean(makePublic),
        publicSlug: makePublic ? makePublicSlug() : null,
        claims: {
          create: (result.claims || []).map((claim: any) => ({
            claimText: claim.claimText || claim.text || '',
            verdict: claim.verdict || 'UNVERIFIED',
            explanation: claim.explanation || null,
            agentAgreementScore: typeof claim.agentAgreementScore === 'number' ? claim.agentAgreementScore : null,
            temporalStatus: claim.temporalStatus || null,
            temporalAnalysis: claim.temporalAnalysis || null,
            evidence: {
              create: (claim.evidence || []).map((ev: any) => ({
                sourceUrl: ev.sourceUrl || ev.url || '',
                title: ev.title || 'Source Reference',
                snippet: ev.snippet || '',
                fullText: ev.fullText || null,
                publishedAt: ev.publishedAt ? new Date(ev.publishedAt) : null,
                stance: ev.stance || null,
                credibility: ev.credibility || 'HIGH',
                credibilityScore: typeof ev.credibilityScore === 'number' ? ev.credibilityScore : null,
              }))
            }
          }))
        }
      }
    });

    // Best-effort upsert of the Source directory used by the evidence graph route.
    for (const claim of result.claims || []) {
      for (const ev of claim.evidence || []) {
        const domain = ev.domain;
        if (!domain) continue;
        try {
          await prisma.source.upsert({
            where: { domain },
            update: { credibilityScore: ev.credibilityScore ?? undefined, isSatire: Boolean(ev.isSatire) },
            create: { domain, credibilityScore: ev.credibilityScore ?? null, isSatire: Boolean(ev.isSatire) },
          });
        } catch {
          // non-critical directory data — don't fail the save over it
        }
      }
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('[Save Analysis API] Database error:', error?.message || error);
    return NextResponse.json(
      { error: 'Could not save analysis to database history at this time.' },
      { status: 503 }
    );
  }
}
