const cheerio = require('cheerio');

async function testAll() {
  console.log('--- Testing Google News RSS ---');
  try {
    const query = 'NASA James Webb telescope discoveries';
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url);
    console.log('Google News Status:', res.status);
    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    
    const items = [];
    $('item').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).find('title').text();
      const link = $(el).find('link').text();
      const snippet = $(el).find('description').text().replace(/<[^>]+>/g, '');
      const source = $(el).find('source').text();
      const sourceUrl = $(el).find('source').attr('url');
      items.push({ title, link, snippet, source, sourceUrl });
    });
    console.log('Google News Items found:', items.length);
    if (items.length > 0) {
      console.log('Sample item:', items[0]);
    }
  } catch (e) {
    console.error('Google News Error:', e);
  }

  console.log('\n--- Testing GNews Clean Query ---');
  try {
    const apiKey = 'dadb48b65ce9dfa4e5570b0ee7d07846';
    const cleanQuery = 'NASA James Webb telescope';
    const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(cleanQuery)}&lang=en&max=5&apikey=${apiKey}`;
    const res = await fetch(gnewsUrl);
    console.log('GNews Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('GNews articles found:', data.articles ? data.articles.length : 0);
      if (data.articles && data.articles.length > 0) {
        console.log('Sample GNews article:', {
          title: data.articles[0].title,
          url: data.articles[0].url,
          source: data.articles[0].source
        });
      }
    } else {
      console.log('GNews error response:', await res.text());
    }
  } catch (e) {
    console.error('GNews Error:', e);
  }

  console.log('\n--- Testing DuckDuckGo Lite ---');
  try {
    const query = 'NASA James Webb telescope';
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: `q=${encodeURIComponent(query)}`
    });
    console.log('DDG Lite status:', res.status);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    $('a.result-link').each((i, el) => {
      if (i >= 5) return false;
      const title = $(el).text().trim();
      const link = $(el).attr('href');
      const snippet = $(el).closest('tr').next().find('.result-snippet').text().trim();
      results.push({ title, link, snippet });
    });
    console.log('DDG Lite results found:', results.length);
    if (results.length > 0) {
      console.log('Sample DDG Lite result:', results[0]);
    }
  } catch (e) {
    console.error('DDG Lite Error:', e);
  }
}

testAll();
