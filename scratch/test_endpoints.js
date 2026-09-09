async function testProviders() {
  console.log('--- 1. Testing GNews ---');
  try {
    const res = await fetch('https://gnews.io/api/v4/search?q=' + encodeURIComponent('James Webb Telescope') + '&lang=en&max=3&apikey=dadb48b65ce9dfa4e5570b0ee7d07846');
    console.log('GNews status:', res.status);
    const d = await res.json();
    console.log('GNews items:', d.articles?.length);
  } catch (e) {
    console.error('GNews error:', e.message);
  }

  console.log('\n--- 2. Testing Google News RSS ---');
  try {
    const res = await fetch('https://news.google.com/rss/search?q=' + encodeURIComponent('James Webb Telescope') + '&hl=en-US&gl=US&ceid=US:en');
    console.log('Google News RSS status:', res.status);
    const xml = await res.text();
    console.log('Google News XML length:', xml.length);
  } catch (e) {
    console.error('Google News error:', e.message);
  }

  console.log('\n--- 3. Testing Wikipedia API ---');
  try {
    const res = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent('James Webb Telescope') + '&format=json&utf8=');
    console.log('Wikipedia status:', res.status);
    const d = await res.json();
    console.log('Wikipedia items:', d.query?.search?.length);
  } catch (e) {
    console.error('Wikipedia error:', e.message);
  }
}

testProviders();
