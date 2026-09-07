import { NextRequest, NextResponse } from 'next/server';
import { extractWithDiagnostics } from '@/lib/extractor';
import { SearchService } from '@/lib/services/search.service';

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided for scraping." }, { status: 400 });
    }

    let targetUrl = url.trim();

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

    if (!result.qualityOk || result.text.length < 150) {
      return NextResponse.json(
        {
          error: 'Unable to extract meaningful article content from this URL.',
          text: '',
          meta: {
            method: result.method,
            charCount: result.rawLength,
            qualityOk: false,
            usedFallback: result.usedFallback,
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

    return NextResponse.json({
      text: result.text,
      finalUrl: targetUrl,
      publisherName,
      meta: {
        method: result.method,
        charCount: result.rawLength,
        qualityOk: result.qualityOk,
        usedFallback: result.usedFallback,
      },
    });
  } catch (error: any) {
    console.error('[Scrape API] Error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during scraping.' },
      { status: 500 }
    );
  }
}

