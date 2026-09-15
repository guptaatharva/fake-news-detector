export const dynamic = 'force-dynamic';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { normalizeUrlForDedup } from '@/lib/normalizeUrl';
import { validateSameOrigin } from '@/lib/security/csrf';

function makePublicSlug(): string {
  return crypto.randomBytes(9).toString('base64url');
}

const EvidenceInputSchema = z.object({
  sourceUrl: z.string().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  snippet: z.string().optional(),
  fullText: z.string().optional().nullable(),
  domain: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
  stance: z.string().optional().nullable(),
  credibility: z.string().optional().nullable(),
  credibilityScore: z.number().optional().nullable(),
  isSatire: z.boolean().optional().nullable(),
});

const ClaimInputSchema = z.object({
  claimText: z.string().optional(),
  text: z.string().optional(),
  verdict: z.string().optional(),
  explanation: z.string().optional().nullable(),
  agentAgreementScore: z.number().optional().nullable(),
  temporalStatus: z.string().optional().nullable(),
  temporalAnalysis: z.string().optional().nullable(),
  confidence: z.number().optional().nullable(),
  evidence: z.array(EvidenceInputSchema).optional(),
});

const ResultInputSchema = z.object({
  verdict: z.string().min(1),
  confidenceScore: z.union([z.number(), z.string()]).transform((v) => Number(v) || 0),
  scoreBreakdown: z.string().optional().nullable(),
  confidenceFactors: z.record(z.any()).optional().nullable(),
  lowSourceDiversity: z.boolean().optional().nullable(),
  summary: z.string().optional().nullable(),
  claims: z.array(ClaimInputSchema).optional(),
});

const SaveAnalysisSchema = z.object({
  sourceUrl: z.string().optional().nullable(),
  textContent: z.string().optional().nullable(),
  result: ResultInputSchema,
  previousVersionId: z.string().optional().nullable(),
  makePublic: z.boolean().optional().nullable(),
});

function parseSafeDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const csrf = validateSameOrigin(req);
  if (!csrf.ok) return csrf.response!;

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

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json({ error: 'Missing or malformed JSON body.' }, { status: 400 });
    }

    const parsed = SaveAnalysisSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid analysis payload.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sourceUrl, textContent, result, previousVersionId, makePublic } = parsed.data;

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
            confidence: typeof claim.confidence === 'number' ? claim.confidence : null,
            evidence: {
              create: (claim.evidence || []).map((ev: any) => ({
                sourceUrl: ev.sourceUrl || ev.url || '',
                title: ev.title || 'Source Reference',
                snippet: ev.snippet || '',
                fullText: ev.fullText || null,
                publishedAt: parseSafeDate(ev.publishedAt),
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
    const isAuthError =
      error?.code === 'P1000' ||
      (typeof error?.message === 'string' && error.message.includes('Authentication failed'));

    if (isAuthError) {
      console.error(
        '[Save Analysis API] Database authentication failed (Prisma P1000). Please check and update your DATABASE_URL / DIRECT_URL credentials in .env.local.',
      );
    } else {
      console.error('[Save Analysis API] Database error:', error?.message || error);
    }

    return NextResponse.json(
      {
        error: isAuthError
          ? 'Database authentication failed. Verify database credentials in .env.local.'
          : 'Could not save analysis to database history at this time.',
      },
      { status: 503 },
    );
  }
}
