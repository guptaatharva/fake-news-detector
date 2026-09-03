// Test multiple search approaches

async function testDDGWithTlsSkip() {
  // Temporarily disable for diagnosis only
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const cheerio = require('cheerio');
  const query = 'India economy 2026';
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  console.log('=== TEST 1: DuckDuckGo HTML (TLS skip) ===');
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    console.log('HTTP Status:', response.status);
    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const $ = cheerio.load(html);
    console.log('.result__body count:', $('.result__body').length);
    console.log('.result count:', $('.result').length);
    
    // Show first 3 results
    let count = 0;
    $('.result__body').each((i, element) => {
      if (count >= 3) return false;
      const titleEl = $(element).find('.result__title .result__a');
      const title = titleEl.text().trim();
      let link = titleEl.attr('href') || '';
      if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        const targetUrl = urlParams.get('uddg');
        if (targetUrl) link = decodeURIComponent(targetUrl);
      }
      console.log(`  [${count+1}] ${title} -> ${link.substring(0, 80)}`);
      count++;
    });
    
    if (count === 0) {
      console.log('  NO RESULTS FOUND. Checking for CAPTCHA/block...');
      console.log('  HTML preview:', html.substring(0, 500));
    }
  } catch (e) {
    console.log('  DDG FAILED:', e.message);
  }
  
  // Test 2: GNews API (already have key)
  console.log('\n=== TEST 2: GNews API ===');
  const gnewsKey = 'dadb48b65ce9dfa4e5570b0ee7d07846';
  try {
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${gnewsKey}`;
    const response = await fetch(gnewsUrl);
    console.log('HTTP Status:', response.status);
    const data = await response.json();
    console.log('Total articles:', data.totalArticles);
    if (data.articles) {
      data.articles.slice(0, 3).forEach((a, i) => {
        console.log(`  [${i+1}] ${a.title}`);
        console.log(`       URL: ${a.url}`);
        console.log(`       Source: ${a.source?.name}`);
        console.log(`       Snippet: ${(a.description || '').substring(0, 100)}`);
      });
    } else {
      console.log('  No articles field. Full response:', JSON.stringify(data).substring(0, 500));
    }
  } catch (e) {
    console.log('  GNews FAILED:', e.message);
  }
}

testDDGWithTlsSkip().catch(console.error);
