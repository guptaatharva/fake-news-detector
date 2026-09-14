import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { extractWithDiagnostics } from '@/lib/extractor';
import { SearchService } from '@/lib/services/search.service';
import { guardApiRequest } from '@/lib/security/apiGuard';
import { UnsafeUrlError } from '@/lib/security/ssrf';
import { detectPromptInjection } from '@/lib/promptSafety';

export const maxDuration = 45;

const RequestSchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  // limit raised from 40: a single 15-claim analysis alone can make up to 45
  // scrape calls (up to 3 sources per claim), so 40 could self-rate-limit a
  // single normal analysis.
  const guard = await guardApiRequest(req, { scope: 'analyze:scrape', limit: 80, windowMs: 60_000, requireAuth: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    let targetUrl = parsed.data.url.trim();

    // Guard: If an intermediary Google News URL is received, resolve it to the original publisher URL
    if (targetUrl.includes('news.google.com')) {
      const resolved = await SearchService.resolveGoogleNewsUrl(targetUrl);
      if (resolved && !resolved.includes('news.google.com')) {
        targetUrl = resolved;
      } else {
        console.warn(`[Research] Rejected Google News intermediary URL that could not be resolved: ${targetUrl}`);
        return NextResponse.json(
          { error: 'Cannot scrape Google News intermediary redirect pages.' },
          { status: 422 }
        );
      }
    }

    console.log(`[Research] Candidate URL: ${targetUrl}`);
    console.log(`[Research] Fetching: ${targetUrl}`);

    const result = await extractWithDiagnostics(targetUrl);

    // Log structured diagnostics server-side
    const d = result.diagnostics;
    console.log(`[Research] HTTP status: ${d.httpStatus ?? 'N/A'}`);
    console.log(`[Research] Extracted characters: ${result.text.length}`);
    console.log(`[Research] Content quality: ${result.qualityOk ? 'PASS' : 'FAIL'}`);

    if (d.robotsBlocked) {
      return NextResponse.json(
        { error: "This site's robots.txt disallows scraping this page.", text: '' },
        { status: 422 }
      );
    }

    if (!result.qualityOk || result.text.length < 150) {
      return NextResponse.json(
        {
          error: result.paywalled
            ? 'This page appears to be paywalled — full article content could not be read.'
            : 'Unable to extract meaningful article content from this URL.',
          text: '',
          meta: {
            method: result.method,
            charCount: result.rawLength,
            qualityOk: false,
            usedFallback: result.usedFallback,
            paywalled: result.paywalled,
          },
        },
        { status: 422 }
      );
    }

    let publisherName = 'Publisher';
    try {
      publisherName = new URL(targetUrl).hostname.replace(/^www\./, '');
    } catch {
      publisherName = 'Publisher';
    }
    console.log(`[Research] Accepted source: ${publisherName}`);

    const injectionSuspected = detectPromptInjection(result.text);
    if (injectionSuspected) {
      console.warn(`[Research] Possible prompt-injection pattern detected in scraped content from ${targetUrl}`);
    }

    return NextResponse.json({
      text: result.text,
      finalUrl: targetUrl,
      publisherName,
      byline: result.byline,
      publishedAt: result.publishedAt,
      injectionSuspected,
      meta: {
        method: result.method,
        charCount: result.rawLength,
        qualityOk: result.qualityOk,
        usedFallback: result.usedFallback,
        paywalled: result.paywalled,
      },
    });
  } catch (error: any) {
    console.error('[Scrape API] Error:', error.message || error);
    const status = error instanceof UnsafeUrlError ? 400 : 500;
    return NextResponse.json(
      { error: error.message || 'An error occurred during scraping.' },
      { status }
    );
  }
}
