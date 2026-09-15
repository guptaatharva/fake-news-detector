import { describe, it, expect } from 'vitest';
import { SearchService } from './search.service';

describe('SearchService.sanitizeQuery', () => {
  it('strips site: operators and boolean keywords', () => {
    const result = SearchService.sanitizeQuery('site:reuters.com election fraud AND voting');
    expect(result).not.toMatch(/site:/i);
    expect(result).not.toMatch(/\bAND\b/);
  });

  it('removes quotes and punctuation that break provider syntax', () => {
    const result = SearchService.sanitizeQuery(`"The president said" it's true!`);
    expect(result).not.toMatch(/['"]/);
  });

  it('shortens overly long queries to key terms', () => {
    const longClaim =
      'The government announced today that it will be implementing a brand new comprehensive policy framework regarding renewable energy infrastructure investment nationwide';
    const result = SearchService.sanitizeQuery(longClaim);
    expect(result.split(/\s+/).length).toBeLessThanOrEqual(8);
  });

  it('returns an empty string for empty input', () => {
    expect(SearchService.sanitizeQuery('')).toBe('');
  });
});

describe('SearchService.searchWeb with DuckDuckGo Lite fallback', () => {
  it('parses DuckDuckGo Lite HTML fixture and decodes uddg redirect links', async () => {
    const mockDdgHtml = `
      <html>
        <body>
          <table>
            <tr>
              <td>
                <a class="result-link" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.reuters.com%2Fworld%2Felection-update">Reuters - Global Election Coverage</a>
              </td>
            </tr>
            <tr>
              <td class="result-snippet">
                Official updates on election results and factual counts from election commission.
              </td>
            </tr>
            <tr>
              <td>
                <a class="result-link" href="https://apnews.com/article/voting-facts">AP News - Fact Check on Voting</a>
              </td>
            </tr>
            <tr>
              <td class="result-snippet">
                Independent analysis confirms voting procedures followed standard protocols.
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Mock fetch so GNews & Google News RSS fail, leading to DuckDuckGo Lite
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('news.google.com')) {
        return new Response('Not Found', { status: 404 });
      }
      if (url.includes('duckduckgo.com')) {
        return new Response(mockDdgHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }
      return new Response('Error', { status: 500 });
    };

    try {
      const results = await SearchService.searchWeb('election fraud fact check', 5);
      expect(results.length).toBe(2);

      // Verify uddg URL was decoded
      expect(results[0].title).toBe('Reuters - Global Election Coverage');
      expect(results[0].sourceUrl).toBe('https://www.reuters.com/world/election-update');
      expect(results[0].domain).toBe('reuters.com');
      expect(results[0].snippet).toContain('Official updates on election results');
      expect(results[0].provider).toBe('DuckDuckGo Lite');

      // Verify direct link
      expect(results[1].title).toBe('AP News - Fact Check on Voting');
      expect(results[1].sourceUrl).toBe('https://apnews.com/article/voting-facts');
      expect(results[1].domain).toBe('apnews.com');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('SearchService.resolveGoogleNewsUrl SSRF defense', () => {
  it('returns null and does not follow redirects to private/internal IPs', async () => {
    const unsafeInternalUrl = 'https://news.google.com/rss/articles/CBMiRGh0dHA6Ly8xNjkuMjU0LjE2OS4yNTQvbGF0ZXN0L21ldGEtZGF0YS9pYW0vc2VjdXJpdHktY3JlZGVudGlhbHMv';
    
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('batchexecute')) {
        return new Response('fail', { status: 500 });
      }
      // Simulate malicious redirect to metadata endpoint
      return new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      });
    };

    try {
      const result = await SearchService.resolveGoogleNewsUrl(unsafeInternalUrl);
      // Must be safely rejected, not returning the metadata IP
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
