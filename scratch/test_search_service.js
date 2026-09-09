const cheerio = require('cheerio');
require('dotenv').config({ path: '.env.local' });

class SearchService {
  static sanitizeQuery(rawQuery) {
    if (!rawQuery) return '';

    let clean = rawQuery
      .replace(/site:\S+/gi, '')
      .replace(/\b(OR|AND|NOT)\b/g, ' ')
      .replace(/[^\w\s\-\."']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 10) {
      const stopWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'that', 'this', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing']);
      const importantWords = words.filter(w => !stopWords.has(w.toLowerCase()));
      clean = (importantWords.length >= 4 ? importantWords.slice(0, 8) : words.slice(0, 8)).join(' ');
    }

    return clean;
  }

  static async searchWeb(rawQuery, limit = 5) {
    const query = this.sanitizeQuery(rawQuery);
    if (!query) {
      throw new Error('Search query is empty after sanitization.');
    }

    const errors = [];

    // Provider 1: GNews API
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
      try {
        const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${gnewsKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(gnewsUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          if (data.articles && Array.isArray(data.articles) && data.articles.length > 0) {
            const results = [];
            for (const article of data.articles) {
              if (results.length >= limit) break;
              if (article.url && article.title) {
                let domain = '';
                try {
                  domain = new URL(article.url).hostname.replace(/^www\./, '');
                } catch {
                  domain = article.source?.name || 'news';
                }
                results.push({
                  title: article.title,
                  link: article.url,
                  domain: domain,
                  snippet: article.description || article.content || '',
                  provider: 'GNews API',
                });
              }
            }

            if (results.length > 0) {
              console.log(`[Search] Query: "${query}"`);
              console.log(`[Search] Provider: GNews API`);
              console.log(`[Search] Results returned: ${results.length}`);
              return results;
            }
          }
        } else {
          const errorBody = await response.text().catch(() => '');
          const errorMsg = `GNews API failed with status ${response.status}: ${errorBody.substring(0, 200)}`;
          console.warn(`[Search] ${errorMsg}`);
          errors.push(errorMsg);
        }
      } catch (err) {
        const errorMsg = `GNews API request error: ${err.message}`;
        console.warn(`[Search] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Provider 2: Google News RSS
    try {
      const gnewsRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(gnewsRssUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const xml = await response.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        const results = [];

        $('item').each((i, el) => {
          if (results.length >= limit) return false;
          const title = $(el).find('title').text().trim();
          const link = $(el).find('link').text().trim();
          const rawSnippet = $(el).find('description').text().replace(/<[^>]+>/g, ' ').trim();
          const sourceName = $(el).find('source').text().trim();
          const sourceUrl = $(el).find('source').attr('url') || '';

          if (title && link) {
            let domain = '';
            try {
              if (sourceUrl) {
                domain = new URL(sourceUrl).hostname.replace(/^www\./, '');
              } else {
                domain = new URL(link).hostname.replace(/^www\./, '');
              }
            } catch {
              domain = sourceName || 'google-news';
            }

            results.push({
              title,
              link,
              domain: domain || sourceName || 'news',
              snippet: rawSnippet,
              provider: 'Google News RSS',
            });
          }
        });

        if (results.length > 0) {
          console.log(`[Search] Query: "${query}"`);
          console.log(`[Search] Provider: Google News RSS`);
          console.log(`[Search] Results returned: ${results.length}`);
          return results;
        }
      } else {
        errors.push(`Google News RSS returned status ${response.status}`);
      }
    } catch (err) {
      errors.push(`Google News RSS request error: ${err.message}`);
    }

    // Provider 3: DuckDuckGo Lite
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
        const results = [];

        $('a.result-link').each((i, el) => {
          if (results.length >= limit) return false;
          const title = $(el).text().trim();
          let link = $(el).attr('href') || '';
          
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
              domain = new URL(link).hostname.replace(/^www\./, '');
            } catch {
              domain = 'web';
            }
            results.push({
              title,
              link,
              domain,
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
    } catch (err) {
      errors.push(`DuckDuckGo Lite request error: ${err.message}`);
    }

    console.error(`[Search] All search providers failed for query: "${query}". Errors:`, errors.join(' | '));
    throw new Error(`All search providers failed. ${errors.join('; ')}`);
  }
}

async function run() {
  const testQueries = [
    'NASA James Webb Telescope discovers water vapor on rocky exoplanet',
    'WHO issues warning over new mpox strain spreading globally',
    'India launch Chandrayaan 4 mission planned for 2028'
  ];

  for (const q of testQueries) {
    console.log(`\n========================================`);
    console.log(`Testing query: "${q}"`);
    try {
      const results = await SearchService.searchWeb(q, 4);
      console.log(`Retrieved ${results.length} results:`);
      results.forEach((r, idx) => {
        console.log(`  [${idx + 1}] [${r.provider}] ${r.domain}: ${r.title}`);
        console.log(`      Link: ${r.link}`);
      });
    } catch (e) {
      console.error(`Search failed for "${q}":`, e.message);
    }
  }
}

run();
