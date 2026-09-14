import { prisma } from './prisma';

export interface UserStats {
  totalAnalyses: number;
  verdictCounts: Record<string, number>;
  topDomains: Array<{ domain: string; count: number }>;
}

/** Shared by /api/stats and the server-rendered profile page (§6.5). */
export async function computeUserStats(userId: string): Promise<UserStats> {
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    select: { verdict: true, sourceUrl: true },
  });

  const verdictCounts: Record<string, number> = {};
  const domainCounts: Record<string, number> = {};

  for (const a of analyses) {
    verdictCounts[a.verdict] = (verdictCounts[a.verdict] || 0) + 1;
    if (a.sourceUrl) {
      try {
        const domain = new URL(a.sourceUrl).hostname.replace(/^www\./, '');
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch {
        // ignore malformed stored URLs
      }
    }
  }

  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  return { totalAnalyses: analyses.length, verdictCounts, topDomains };
}
