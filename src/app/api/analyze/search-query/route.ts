import { NextRequest, NextResponse } from 'next/server';
import { SearchService } from '@/lib/services/search.service';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { claim, originalUrl } = await req.json();

    if (!claim || typeof claim !== 'string' || claim.trim().length === 0) {
      return NextResponse.json({ error: "No valid claim provided for searching." }, { status: 400 });
    }

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

