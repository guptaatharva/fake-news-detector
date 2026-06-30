import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

export class SearchService {
  /**
   * Scrapes DuckDuckGo HTML version to retrieve top search results for a given query.
   * @param query The search query string.
   * @param limit The maximum number of results to return.
   * @returns Array of SearchResult objects containing title, link, and snippet.
   */
  static async searchWeb(query: string, limit: number = 3): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        console.warn(`Search failed with status: ${response.status}`);
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const results: SearchResult[] = [];

      // DuckDuckGo HTML search results are typically in .result__body
      $('.result__body').each((i, element) => {
        if (i >= limit) return false; // Break loop when limit reached

        const titleEl = $(element).find('.result__title .result__a');
        const snippetEl = $(element).find('.result__snippet');
        
        // Extract original URL from DuckDuckGo's redirect URL if necessary
        let link = titleEl.attr('href') || '';
        if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
           const urlParams = new URLSearchParams(link.split('?')[1]);
           const targetUrl = urlParams.get('uddg');
           if (targetUrl) link = decodeURIComponent(targetUrl);
        } else if (link.startsWith('http')) {
           // Direct link
        }

        const title = titleEl.text().trim();
        const snippet = snippetEl.text().trim();

        if (title && link) {
          results.push({ title, link, snippet });
        }
      });

      return results;
    } catch (error) {
      console.error('Error during web search:', error);
      return [];
    }
  }
}
