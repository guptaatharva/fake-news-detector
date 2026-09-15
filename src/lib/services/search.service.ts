import * as cheerio from 'cheerio';
import { assertSafeUrl } from '../security/ssrf';

export interface SearchResult {
  title: string;
  sourceUrl: string;
  link: string;
  url?: string;
  originalSearchUrl?: string;
  domain: string;
  source: string;
  snippet: string;
  publishedAt?: string;
  provider?: string;
}

export class SearchService {
  /**
   * Resolves a Google News intermediary / redirect URL to the original publisher URL.
   * Uses Google's internal batchexecute RPC (Fbv4je) with automatic fallback to HTTP redirection.
   */
  static async resolveGoogleNewsUrl(googleNewsUrl: string): Promise<string | null> {
    if (!googleNewsUrl) return null;
    
    // If it's already a direct publisher URL, return it
    if (!googleNewsUrl.includes('news.google.com')) {
      return googleNewsUrl;
    }

    console.log(`[Search] Resolving source URL: ${googleNewsUrl}`);

    // Tier 1: batchexecute RPC resolution
    try {
      const urlObj = new URL(googleNewsUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const base64Str = pathParts[pathParts.length - 1];

      if (base64Str) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const articlePageRes = await fetch(`https://news.google.com/rss/articles/${base64Str}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        clearTimeout(timeout);

        if (articlePageRes.ok) {
          const html = await articlePageRes.text();
          const $ = cheerio.load(html);

          let signature = $('c-wiz > div[jscontroller]').attr('data-n-a-sg');
          let timestamp = $('c-wiz > div[jscontroller]').attr('data-n-a-ts');

          if (!signature || !timestamp) {
            const anyEl = $('[data-n-a-sg]');
            signature = anyEl.attr('data-n-a-sg');
            timestamp = anyEl.attr('data-n-a-ts');
          }

          if (signature && timestamp) {
            const innerReq = JSON.stringify([
              'garturlreq',
              [
                ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
                'X',
                'X',
                1,
                [1, 1, 1],
                1,
                1,
                null,
                0,
                0,
                null,
                0,
              ],
              base64Str,
              parseInt(timestamp, 10),
              signature,
            ]);

            const payload = ['Fbv4je', innerReq];
            const body = 'f.req=' + encodeURIComponent(JSON.stringify([[payload]]));

            const rpcController = new AbortController();
            const rpcTimeout = setTimeout(() => rpcController.abort(), 6000);

            const rpcRes = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
              method: 'POST',
              signal: rpcController.signal,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              },
              body,
            });
            clearTimeout(rpcTimeout);

            if (rpcRes.ok) {
              const rpcText = await rpcRes.text();
              const parts = rpcText.split('\n\n');
              if (parts.length >= 2) {
                const parsed = JSON.parse(parts[1]);
                const innerJson = JSON.parse(parsed[0][2]);
                const finalUrl = innerJson[1];

                if (finalUrl && typeof finalUrl === 'string' && finalUrl.startsWith('http') && !finalUrl.includes('news.google.com')) {
                  console.log(`[Search] Resolved publisher URL: ${finalUrl}`);
                  return finalUrl;
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      // Log and proceed to fallback
    }

    // Tier 2: HTTP redirect following fallback with per-hop SSRF validation
    try {
      let currentUrl = googleNewsUrl;
      let finalResolvedUrl: string | null = null;
      const MAX_REDIRECTS = 5;

      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        try {
          await assertSafeUrl(currentUrl);
        } catch {
          console.warn(`[Search] Blocked unsafe URL in Google News redirect chain: ${currentUrl}`);
          break;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        let res: Response;
        try {
          res = await fetch(currentUrl, {
            signal: controller.signal,
            redirect: 'manual',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          });
        } finally {
          clearTimeout(timeout);
        }

        const isRedirect = res.status >= 300 && res.status < 400;
        if (isRedirect) {
          const location = res.headers.get('location');
          if (!location) break;
          const nextUrl = new URL(location, currentUrl).toString();
          currentUrl = nextUrl;
          if (nextUrl.startsWith('http') && !nextUrl.includes('news.google.com')) {
            try {
              await assertSafeUrl(nextUrl);
              finalResolvedUrl = nextUrl;
            } catch {
              console.warn(`[Search] Blocked unsafe redirect target: ${nextUrl}`);
            }
            break;
          }
          continue;
        }

        // If landing URL is non-redirect and non-Google
        if (currentUrl.startsWith('http') && !currentUrl.includes('news.google.com')) {
          finalResolvedUrl = currentUrl;
          break;
        }

        // Check for canonical or og:url meta tags in the response HTML
        const html = await res.text();
        const $ = cheerio.load(html);
        const canonical = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content');
        if (canonical && canonical.startsWith('http') && !canonical.includes('news.google.com')) {
          try {
            await assertSafeUrl(canonical);
            finalResolvedUrl = canonical;
          } catch {
            console.warn(`[Search] Blocked unsafe canonical target: ${canonical}`);
          }
        }
        break;
      }

      if (finalResolvedUrl) {
        console.log(`[Search] Resolved publisher URL: ${finalResolvedUrl}`);
        return finalResolvedUrl;
      }
    } catch (e: any) {
      // Fallback failed
    }

    console.warn(`[Search] Could not resolve Google News URL to publisher URL: ${googleNewsUrl}`);
    return null;
  }

  /**
   * Sanitizes a search query for web search engines.
   * Strips problematic boolean operators (like site:), removes special characters,
   * and shortens long claims to the most relevant keyword terms.
   */
  static sanitizeQuery(rawQuery: string): string {
    if (!rawQuery) return '';

    // Remove site:, boolean operators, and all quotes/punctuation that cause GNews 400 syntax errors
    let clean = rawQuery
      .replace(/site:\S+/gi, '')
      .replace(/\b(OR|AND|NOT)\b/g, ' ')
      .replace(/['"’`]/g, '') // remove single and double quotes completely
      .replace(/[^\w\s\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If query is still overly long (more than 10 words), take the key terms
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 8) {
      // Filter out trivial stop words if too long
      const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'that', 'this', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'currently', 'recently']);
      const importantWords = words.filter(w => !stopWords.has(w.toLowerCase()));
      clean = (importantWords.length >= 4 ? importantWords.slice(0, 8) : words.slice(0, 8)).join(' ');
    }

    return clean;
  }

  /**
   * Searches the live web using a multi-provider fallback chain:
   * 1. GNews API (if configured and operational)
   * 2. Google News RSS (high reliability live news index with publisher URL resolution)
   * 3. DuckDuckGo Lite (general web search)
   */
  static async searchWeb(rawQuery: string, limit: number = 5): Promise<SearchResult[]> {
    const query = this.sanitizeQuery(rawQuery);
    if (!query) {
      throw new Error('Search query is empty after sanitization.');
    }

    const errors: string[] = [];

    // --- Provider 1: GNews API ---
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
      try {
        const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${gnewsKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(gnewsUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'VeraCiusAI-Research/1.0',
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.articles && data.articles.length > 0) {
            console.log(`[Search] Query: "${query}"`);
            console.log(`[Search] Provider: GNews API`);
            console.log(`[Search] Results returned: ${data.articles.length}`);
            return data.articles.map((a: any) => {
              let domain = '';
              try {
                domain = new URL(a.url).hostname.replace(/^www\./, '').toLowerCase();
              } catch {
                domain = a.source?.name ? a.source.name.toLowerCase().replace(/\s+/g, '') : 'news';
              }
              const sourceName = a.source?.name || domain;
              return {
                title: a.title || 'Untitled',
                sourceUrl: a.url,
                link: a.url,
                url: a.url,
                originalSearchUrl: a.url,
                source: sourceName,
                domain,
                snippet: a.description || '',
                publishedAt: a.publishedAt || undefined,
                provider: 'GNews API',
              };
            });
          }
        } else {
          const errBody = await res.text().catch(() => '');
          console.warn(`[Search] GNews API failed with status ${res.status}: ${errBody.substring(0, 200)}`);
          errors.push(`GNews API status ${res.status}`);
        }
      } catch (err: any) {
        console.warn(`[Search] GNews request error: ${err.message}`);
        errors.push(`GNews error: ${err.message}`);
      }
    }

    // --- Provider 2: Google News RSS (Live Web Fallback 1) ---
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(rssUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/130.0.0.0',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        
        // Extract raw candidates from RSS
        interface RawRssItem {
          title: string;
          link: string;
          snippet: string;
          sourceName: string;
          sourceRootUrl: string;
          pubDate: string;
        }

        const rawItems: RawRssItem[] = [];
        $('item').each((i, el) => {
          if (rawItems.length >= limit * 2) return false;
          const title = $(el).find('title').text().trim();
          const link = $(el).find('link').text().trim();
          const rawSnippet = $(el).find('description').text().replace(/<[^>]+>/g, ' ').trim();
          const sourceName = $(el).find('source').text().trim();
          const sourceRootUrl = $(el).find('source').attr('url') || '';
          const pubDate = $(el).find('pubDate').text().trim();

          if (title && link) {
            rawItems.push({
              title,
              link,
              snippet: rawSnippet,
              sourceName,
              sourceRootUrl,
              pubDate,
            });
          }
        });

        // Resolve Google News intermediary URLs to actual publisher URLs
        const resolvedResults: SearchResult[] = [];
        for (const item of rawItems) {
          if (resolvedResults.length >= limit) break;

          const resolvedUrl = await this.resolveGoogleNewsUrl(item.link);
          if (!resolvedUrl || resolvedUrl.includes('news.google.com')) {
            // Never treat Google News intermediary URLs as final source URLs
            continue;
          }

          let domain = '';
          try {
            domain = new URL(resolvedUrl).hostname.replace(/^www\./, '').toLowerCase();
          } catch {
            if (item.sourceRootUrl) {
              try {
                domain = new URL(item.sourceRootUrl).hostname.replace(/^www\./, '').toLowerCase();
              } catch {
                domain = item.sourceName || 'news';
              }
            } else {
              domain = item.sourceName || 'news';
            }
          }

          const sourceName = item.sourceName || domain;

          resolvedResults.push({
            title: item.title,
            sourceUrl: resolvedUrl,
            link: resolvedUrl,
            url: resolvedUrl,
            originalSearchUrl: item.link,
            domain,
            source: sourceName,
            snippet: item.snippet,
            publishedAt: item.pubDate || undefined,
            provider: 'Google News RSS',
          });
        }

        if (resolvedResults.length > 0) {
          console.log(`[Search] Query: "${query}"`);
          console.log(`[Search] Provider: Google News RSS`);
          console.log(`[Search] Results returned: ${resolvedResults.length}`);
          return resolvedResults;
        }
      } else {
        errors.push(`Google News RSS returned status ${res.status}`);
      }
    } catch (err: any) {
      errors.push(`Google News RSS request error: ${err.message}`);
    }

    // --- Provider 3: DuckDuckGo Lite (Live Web Fallback 2) ---
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        body: `q=${encodeURIComponent(query)}`,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        const results: SearchResult[] = [];

        $('a.result-link').each((i, el) => {
          if (results.length >= limit) return false;
          const title = $(el).text().trim();
          let link = $(el).attr('href') || '';
          
          // Decode DDG redirect URL if needed
          if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
            const urlParams = new URLSearchParams(link.split('?')[1]);
            const targetUrl = urlParams.get('uddg');
            if (targetUrl) link = decodeURIComponent(targetUrl);
          } else if (link.startsWith('/l/?uddg=')) {
            const urlParams = new URLSearchParams(link.split('?')[1]);
            const targetUrl = urlParams.get('uddg');
            if (targetUrl) link = decodeURIComponent(targetUrl);
          }

          const snippet = $(el).closest('tr').next().find('.result-snippet').text().trim();

          if (title && link && link.startsWith('http')) {
            let domain = '';
            try {
              domain = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
            } catch {
              domain = 'web';
            }
            results.push({
              title,
              sourceUrl: link,
              link,
              url: link,
              originalSearchUrl: link,
              domain,
              source: domain,
              snippet,
              provider: 'DuckDuckGo Lite',
            });
          }
        });

        if (results.length > 0) {
          console.log(`[Search] Query: "${query}"`);
          console.log(`[Search] Provider: DuckDuckGo Lite`);
          console.log(`[Search] Results returned: ${results.length}`);
          return results;
        }
      } else {
        errors.push(`DuckDuckGo Lite returned status ${response.status}`);
      }
    } catch (err: any) {
      errors.push(`DuckDuckGo Lite request error: ${err.message}`);
    }

    // If all providers failed, report detailed diagnostics
    console.error(`[Search] All search providers failed for query: "${query}". Errors:`, errors.join(' | '));
    throw new Error(`All search providers failed. ${errors.join('; ')}`);
  }
}


