import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

// Rebuilt against the schema that actually exists in this repo (Analysis /
// Claim / Evidence / Source / ClaimRelationship — see prisma/schema.prisma)
// and real Supabase session auth, replacing the previous version's imports of
// a nonexistent `prisma.verificationReport` model and a nonexistent `@/auth`
// module (§1.3). Ownership is enforced: a caller can only graph their own
// saved analyses, or a report explicitly marked public.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('reportId') || searchParams.get('analysisId');

    if (!analysisId) {
      return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
    }

    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      include: {
        claims: {
          include: {
            evidence: { include: { source: true } },
            sourceRelations: true,
            targetRelations: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (!analysis.isPublic) {
      const user = await getAuthedUser();
      if (!user || user.id !== analysis.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Transform into React Flow-shaped nodes and edges
    const nodes: any[] = [];
    const edges: any[] = [];

    nodes.push({
      id: `report-${analysis.id}`,
      type: 'reportNode',
      data: {
        label: analysis.summary,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
      },
      position: { x: 250, y: 0 },
    });

    let yOffset = 150;

    analysis.claims.forEach((claim) => {
      const claimNodeId = `claim-${claim.id}`;
      nodes.push({
        id: claimNodeId,
        type: 'claimNode',
        data: {
          label: claim.claimText,
          status: claim.verdict,
          temporalStatus: claim.temporalStatus,
          agentAgreementScore: claim.agentAgreementScore,
        },
        position: { x: 250, y: yOffset },
      });

      edges.push({
        id: `edge-report-claim-${claim.id}`,
        source: `report-${analysis.id}`,
        target: claimNodeId,
        animated: true,
      });

      let xOffset = 0;

      claim.evidence.forEach((ev) => {
        const evNodeId = `evidence-${ev.id}`;
        nodes.push({
          id: evNodeId,
          type: 'evidenceNode',
          data: {
            label: ev.title || ev.sourceUrl,
            stance: ev.stance,
            credibility: ev.credibilityScore,
            sourceDomain: ev.source?.domain,
          },
          position: { x: xOffset, y: yOffset + 150 },
        });

        edges.push({
          id: `edge-claim-evidence-${ev.id}`,
          source: claimNodeId,
          target: evNodeId,
          label: ev.stance || undefined,
          animated: true,
          style: {
            stroke: ev.stance === 'SUPPORTS' ? 'green' : ev.stance === 'CONTRADICTS' ? 'red' : 'gray',
          },
        });

        xOffset += 200;
      });

      yOffset += 300;
    });

    analysis.claims.forEach((claim) => {
      claim.sourceRelations.forEach((rel) => {
        edges.push({
          id: `edge-rel-${rel.id}`,
          source: `claim-${rel.sourceClaimId}`,
          target: `claim-${rel.targetClaimId}`,
          label: rel.relationshipType,
          animated: true,
        });
      });
    });

    return NextResponse.json({ nodes, edges });
  } catch (error: any) {
    console.error('Error fetching graph:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
