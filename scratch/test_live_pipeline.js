const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { Readability } = require('@mozilla/readability');
const { JSDOM, VirtualConsole } = require('jsdom');
require('dotenv').config({ path: '.env.local' });

// 1. Search with DDG Lite and GNews
async function searchWeb(query, limit = 4) {
  console.log(`[Search] Query: "${query}"`);
  
  // Try GNews first if key present
  const gnewsKey = process.env.GNEWS_API_KEY;
  if (gnewsKey) {
    try {
      const clean = query.replace(/[^\w\s]/g, ' ').split(/\s+/).slice(0, 6).join(' ');
      const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(clean)}&lang=en&max=${limit}&apikey=${gnewsKey}`;
      const res = await fetch(gnewsUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          const results = data.articles.map(a => ({
            title: a.title,
            link: a.url,
            domain: new URL(a.url).hostname.replace(/^www\./, ''),
            snippet: a.description || a.content || '',
            provider: 'GNews'
          }));
          console.log(`[Search] Provider: GNews | Results: ${results.length}`);
          return results;
        }
      }
    } catch (e) {
      console.warn('[Search] GNews failed, falling back to DDG Lite');
    }
  }

  // DDG Lite fallback
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      body: `q=${encodeURIComponent(query)}`
    });

    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const results = [];

      $('a.result-link').each((i, el) => {
        if (results.length >= limit) return false;
        const title = $(el).text().trim();
        let link = $(el).attr('href') || '';
        if (link.includes('uddg=')) {
          const u = new URLSearchParams(link.split('?')[1]).get('uddg');
          if (u) link = decodeURIComponent(u);
        }
        const snippet = $(el).closest('tr').next().find('.result-snippet').text().trim();

        if (title && link && link.startsWith('http')) {
          let domain = '';
          try {
            domain = new URL(link).hostname.replace(/^www\./, '');
          } catch {
            domain = 'web';
          }
          results.push({ title, link, domain, snippet, provider: 'DuckDuckGo Lite' });
        }
      });

      console.log(`[Search] Provider: DuckDuckGo Lite | Results: ${results.length}`);
      return results;
    }
  } catch (e) {
    console.error('[Search] DDG Lite error:', e.message);
  }

  return [];
}

// 2. Resilient Scraper
async function scrapeUrl(url) {
  console.log(`[Research] Fetching: ${url}`);
  
  // Tier 1: Fast fetch + Readability
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });
    clearTimeout(timeout);

    console.log(`[Research] HTTP status: ${res.status}`);
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) {
        const vc = new VirtualConsole();
        vc.on('error', () => {});
        const dom = new JSDOM(html, { url, virtualConsole: vc });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article && article.textContent && article.textContent.trim().length >= 150) {
          const text = article.textContent.replace(/\s+/g, ' ').trim();
          console.log(`[Research] Extracted characters: ${text.length}`);
          console.log(`[Research] Content quality: PASS (via Fast Fetch)`);
          return { text, qualityOk: true, method: 'fetch' };
        }
      }
    }
  } catch (e) {
    console.log(`[Research] Fast fetch failed (${e.message}), attempting Puppeteer...`);
  }

  // Tier 2: Puppeteer with request blocking
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'media', 'font', 'stylesheet'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      console.log(`[Research] Puppeteer navigation timeout, reading loaded DOM...`);
    }

    const html = await page.content();
    const vc = new VirtualConsole();
    vc.on('error', () => {});
    const dom = new JSDOM(html, { url: page.url(), virtualConsole: vc });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    let text = article && article.textContent ? article.textContent : (dom.window.document.body ? dom.window.document.body.textContent : '');
    text = (text || '').replace(/\s+/g, ' ').trim();

    const qualityOk = text.length >= 150;
    console.log(`[Research] Extracted characters: ${text.length}`);
    console.log(`[Research] Content quality: ${qualityOk ? 'PASS' : 'FAIL'} (via Puppeteer)`);

    return { text, qualityOk, method: 'puppeteer' };
  } catch (e) {
    console.error(`[Research] Puppeteer failed: ${e.message}`);
    return { text: '', qualityOk: false, method: 'failed' };
  } finally {
    if (browser) await browser.close();
  }
}

async function runTest() {
  const claim = "James Webb Space Telescope detects water vapor on exoplanet";
  const searchResults = await searchWeb(claim, 4);

  const acceptedSources = [];
  const domainSet = new Set();

  for (const item of searchResults) {
    const domain = item.domain;
    if (domainSet.has(domain)) {
      console.log(`[Research] Rejected source: ${domain} (Duplicate domain)`);
      continue;
    }

    const scrapeRes = await scrapeUrl(item.link);
    if (scrapeRes.qualityOk && scrapeRes.text.length >= 150) {
      domainSet.add(domain);
      acceptedSources.push({
        title: item.title,
        domain,
        link: item.link,
        textSnippet: scrapeRes.text.substring(0, 300)
      });
      console.log(`[Research] Accepted source: ${domain}`);
    } else {
      console.log(`[Research] Rejected source: ${domain} (Content quality FAIL or too short)`);
    }
  }

  console.log(`\n========================================`);
  console.log(`[Research] Independent sources: ${acceptedSources.length}`);
  console.log(`Accepted Sources Summary:`, JSON.stringify(acceptedSources, null, 2));
}

runTest();
