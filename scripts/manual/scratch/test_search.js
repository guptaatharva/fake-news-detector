const cheerio = require('cheerio');

async function testSearch() {
  const query = 'India economy 2026';
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  console.log('Fetching:', searchUrl);
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  
  console.log('HTTP Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  const html = await response.text();
  console.log('HTML length:', html.length);
  
  // Save first 2000 chars for inspection
  console.log('\n--- First 2000 chars of HTML ---');
  console.log(html.substring(0, 2000));
  
  const $ = cheerio.load(html);
  
  const results = [];
  
  // Try the expected selectors
  console.log('\n--- Selector test ---');
  console.log('.result__body count:', $('.result__body').length);
  console.log('.result count:', $('.result').length);
  console.log('.results_links count:', $('.results_links').length);
  console.log('.result__title count:', $('.result__title').length);
  console.log('.result__a count:', $('.result__a').length);
  
  // Try parsing
  $('.result__body').each((i, element) => {
    if (i >= 5) return false;
    
    const titleEl = $(element).find('.result__title .result__a');
    const snippetEl = $(element).find('.result__snippet');
    
    let link = titleEl.attr('href') || '';
    if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
      const urlParams = new URLSearchParams(link.split('?')[1]);
      const targetUrl = urlParams.get('uddg');
      if (targetUrl) link = decodeURIComponent(targetUrl);
    }
    
    const title = titleEl.text().trim();
    const snippet = snippetEl.text().trim();
    
    if (title && link) {
      results.push({ title, link, snippet: snippet.substring(0, 100) });
    }
  });
  
  console.log('\n--- Results ---');
  console.log('Total results found:', results.length);
  results.forEach((r, i) => {
    console.log(`\n[${i + 1}]`);
    console.log('  Title:', r.title);
    console.log('  Link:', r.link);
    console.log('  Snippet:', r.snippet);
  });
}

testSearch().catch(console.error);
