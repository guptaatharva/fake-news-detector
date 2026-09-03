require('dotenv').config({ path: '.env.local' });

async function debugErrors() {
  console.log('--- Testing GNews Directly ---');
  try {
    const query = 'James Webb Telescope';
    const gnewsKey = process.env.GNEWS_API_KEY;
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=3&apikey=${gnewsKey}`;
    console.log('Fetching:', url);
    const res = await fetch(url);
    console.log('GNews status:', res.status);
    const text = await res.text();
    console.log('GNews body:', text);
  } catch (e) {
    console.error('GNews error:', e);
  }

  console.log('\n--- Testing DDG Lite Directly ---');
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      body: 'q=James+Webb+Telescope'
    });
    console.log('DDG status:', res.status);
    const text = await res.text();
    console.log('DDG body length:', text.length);
  } catch (e) {
    console.error('DDG error:', e);
  }
}

debugErrors();
