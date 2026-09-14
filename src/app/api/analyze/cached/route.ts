export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';
import { normalizeUrlForDedup } from '@/lib/normalizeUrl';
import { calculateDeterministicConfidence, type ConfidenceFactors } from '@/lib/confidence';

// §REMAINING.md #9 — cross-user result caching. Before the dashboard kicks off
// a full extract → search → scrape → debate pipeline for a URL, it asks this
// route whether a recent analysis of the same URL already exists, so two
// people checking the same viral article get one consistent cached verdict
// instead of two independently-run ones.
//
// Privacy: this only ever matches (a) the caller's OWN past analyses, or
// (b) another user's analysis that they explicitly marked public (isPublic —
// the same flag that already powers /report/[slug]). A private analysis
// someone else ran is never surfaced to a different user, cached or not.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — news develops; don't serve stale verdicts indefinitely

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });

  const rawUrl = req.nextUrl.searchParams.get('url') || '';
  const normalized = normalizeUrlForDedup(rawUrl);
  if (!normalized) {
    return NextResponse.json({ match: null });
  }

  const cutoff = new Date(Date.now() - CACHE_TTL_MS);
  const includeClause = {
    claims: { include: { evidence: { include: { source: true } } } },
  } as const;

  try {
    let analysis = await prisma.analysis.findFirst({
      where: { normalizedSourceUrl: normalized, userId: user.id, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      include: includeClause,
    });
    let isOwn = Boolean(analysis);

    if (!analysis) {
      analysis = await prisma.analysis.findFirst({
        where: {
          normalizedSourceUrl: normalized,
          isPublic: true,
          userId: { not: user.id },
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: 'desc' },
        include: includeClause,
      });
      isOwn = false;
    }

    if (!analysis) {
      return NextResponse.json({ match: null });
    }

    const sourceDomains = new Set<string>();
    const claims = analysis.claims.map((claim) => {
      const evidence = claim.evidence.map((ev) => {
        const domain = ev.source?.domain || hostnameOf(ev.sourceUrl);
        if (domain) sourceDomains.add(domain);
        return {
          sourceUrl: ev.sourceUrl,
          url: ev.sourceUrl,
          title: ev.title,
          snippet: ev.snippet,
          domain,
          credibility: ev.credibility,
          credibilityScore: ev.credibilityScore ?? undefined,
          stance: ev.stance ?? undefined,
          publishedAt: ev.publishedAt ? ev.publishedAt.toISOString() : undefined,
        };
      });
      return {
        claimText: claim.claimText,
        verdict: claim.verdict,
        explanation: claim.explanation || '',
        temporalStatus: claim.temporalStatus ?? undefined,
        temporalAnalysis: claim.temporalAnalysis ?? undefined,
        agentAgreementScore: claim.agentAgreementScore ?? undefined,
        // Per-claim confidence isn't persisted (Claim has no confidence
        // column) — approximate with the overall analysis score rather than
        // showing a misleading 0%. Flagged via `approximateConfidence` below.
        confidence: analysis.confidence,
        evidence,
      };
    });

    const extractedSources = analysis.claims.flatMap((claim) =>
      claim.evidence.map((ev) => ({
        title: ev.title,
        source: ev.source?.domain || hostnameOf(ev.sourceUrl) || ev.title,
        domain: ev.source?.domain || hostnameOf(ev.sourceUrl) || '',
        url: ev.sourceUrl,
        sourceUrl: ev.sourceUrl,
        link: ev.sourceUrl,
        snippet: ev.snippet,
        content: ev.fullText || ev.snippet,
        publishedAt: ev.publishedAt ? ev.publishedAt.toISOString() : undefined,
      })),
    );

    const confidenceFactors = (analysis.confidenceFactors as unknown as ConfidenceFactors | null) || null;
    const confidenceBreakdown = confidenceFactors ? calculateDeterministicConfidence(confidenceFactors) : undefined;

    return NextResponse.json({
      match: {
        id: analysis.id,
        createdAt: analysis.createdAt.toISOString(),
        isOwn,
        isPublic: analysis.isPublic,
        publicSlug: analysis.publicSlug,
        approximateConfidence: true,
        result: {
          verdict: analysis.verdict,
          confidenceScore: analysis.confidence,
          confidenceBreakdown,
          confidenceFactors: confidenceFactors ?? undefined,
          scoreBreakdown: analysis.scoreBreakdown || '',
          summary: analysis.summary,
          claims,
          sourceDomains: Array.from(sourceDomains),
          extractedSources,
          lowSourceDiversity: analysis.lowSourceDiversity,
          completedAt: analysis.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        },
      },
    });
  } catch (error: any) {
    console.error('[Cached Analysis API] Database error:', error?.message || error);
    // Non-critical — the dashboard falls back to running a fresh analysis.
    return NextResponse.json({ match: null });
  }
}
