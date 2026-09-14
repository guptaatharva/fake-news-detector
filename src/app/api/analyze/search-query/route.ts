import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/search.service';
import { guardApiRequest } from '@/lib/security/apiGuard';

export const maxDuration = 30;

const RequestSchema = z.object({
  claim: z.string().min(1).max(2000),
  originalUrl: z.string().max(2048).optional(),
});

export async function POST(req: NextRequest) {
  // limit raised from 40: a single 15-claim analysis alone can make up to 15
  // search-query calls (one per claim), so 40 left little headroom for a
  // user re-checking or running back-to-back analyses within the window.
  const guard = await guardApiRequest(req, { scope: 'analyze:search-query', limit: 60, windowMs: 60_000, requireAuth: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "No valid claim provided for searching." }, { status: 400 });
    }
    const { claim, originalUrl } = parsed.data;

    // Perform live web search for the factual claim
    const rawResults = await SearchService.searchWeb(claim.trim(), 8).catch(err => {
      console.warn(`[Search] Primary search query failed: ${err.message}`);
      return [];
    });

    if (rawResults.length === 0) {
      return NextResponse.json(
        { error: "No search results returned from available web providers." },
        { status: 502 }
      );
    }

    // Deduplicate by independent domain
    const uniqueDomainsMap = new Map();
    for (const res of rawResults) {
      try {
        const targetUrl = res.sourceUrl || res.link;
        let domain = res.domain;
        if (!domain && targetUrl) {
          domain = new URL(targetUrl).hostname.replace(/^www\./, '').toLowerCase();
        }

        // One article per independent domain
        if (domain && !uniqueDomainsMap.has(domain)) {
          uniqueDomainsMap.set(domain, {
            title: res.title,
            source: res.source || domain,
            domain,
            url: targetUrl,
            sourceUrl: targetUrl,
            link: targetUrl,
            originalSearchUrl: res.originalSearchUrl || targetUrl,
            snippet: res.snippet || '',
            publishedAt: res.publishedAt,
            provider: res.provider,
          });
        }
      } catch {
        const fallbackUrl = res.sourceUrl || res.link;
        if (!uniqueDomainsMap.has(fallbackUrl)) {
          uniqueDomainsMap.set(fallbackUrl, {
            ...res,
            url: fallbackUrl,
            sourceUrl: fallbackUrl,
            link: fallbackUrl,
          });
        }
      }
    }

    const searchResults = Array.from(uniqueDomainsMap.values());

    // Filter out the original URL/domain to prevent circular verification
    const filteredResults = [];
    let originalHost = '';
    if (originalUrl) {
      try {
        originalHost = new URL(originalUrl).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        originalHost = '';
      }
    }

    for (const result of searchResults) {
      if (filteredResults.length >= 6) break;

      if (originalHost) {
        try {
          const resultHost = (result.domain || new URL(result.sourceUrl || result.link).hostname).replace(/^www\./, '').toLowerCase();
          if (resultHost.includes(originalHost) || originalHost.includes(resultHost)) {
            continue;
          }
        } catch {
          if ((result.sourceUrl || result.link) === originalUrl) continue;
        }
      }

      filteredResults.push(result);
    }

    console.log(`[Research] Claim: "${claim}"`);
    console.log(`[Research] Search results returned: ${filteredResults.length}`);

    return NextResponse.json({ results: filteredResults });
  } catch (error: any) {
    console.error('[Search Query API] Error:', error.message || error);
    return NextResponse.json({ error: error.message || 'An error occurred during search query.' }, { status: 500 });
  }
}
