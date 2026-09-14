const puppeteer = require('puppeteer');
const { Readability } = require('@mozilla/readability');
const { JSDOM, VirtualConsole } = require('jsdom');
require('dotenv').config({ path: '.env.local' });

async function testFullExtraction() {
  const query = 'Narendra Modi';
  console.log(`[Search] Searching GNews for: "${query}"`);
  const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=3&apikey=${process.env.GNEWS_API_KEY}`;
  const res = await fetch(gnewsUrl);
  const data = await res.json();
  const articles = data.articles || [];

  console.log(`[Search] Found ${articles.length} articles from GNews:`);
  for (const a of articles) {
    console.log(`\n----------------------------------------`);
    console.log(`[Research] Candidate URL: ${a.url}`);
    console.log(`[Research] Source Name: ${a.source?.name}`);
    console.log(`[Research] Title: ${a.title}`);
    
    // Scrape with Fast Fetch + JSDOM Readability
    console.log(`[Research] Fetching: ${a.url}`);
    try {
      const fetchRes = await fetch(a.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'follow'
      });
      console.log(`[Research] HTTP status: ${fetchRes.status}`);

      if (fetchRes.ok) {
        const html = await fetchRes.text();
        const vc = new VirtualConsole();
        vc.on('error', () => {});
        const dom = new JSDOM(html, { url: a.url, virtualConsole: vc });
        const reader = new Readability(dom.window.document);
        const parsed = reader.parse();

        let extractedText = parsed && parsed.textContent ? parsed.textContent.replace(/\s+/g, ' ').trim() : '';
        if (extractedText.length < 200 && dom.window.document.body) {
          // Fallback body text
          extractedText = dom.window.document.body.textContent.replace(/\s+/g, ' ').trim();
        }

        const qualityOk = extractedText.length >= 200;
        console.log(`[Research] Extracted characters: ${extractedText.length}`);
        console.log(`[Research] Content quality: ${qualityOk ? 'PASS' : 'FAIL'}`);
        if (qualityOk) {
          console.log(`[Research] Accepted source: ${new URL(a.url).hostname}`);
          console.log(`[Research] Content preview: ${extractedText.substring(0, 250)}...`);
        } else {
          console.log(`[Research] Rejected source: ${new URL(a.url).hostname} (Insufficient content length)`);
        }
      }
    } catch (err) {
      console.error(`[Research] Rejected source: ${a.url} (Fetch failed: ${err.message})`);
    }
  }
}

testFullExtraction();
