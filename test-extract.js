const url = 'https://timesofindia.indiatimes.com/india/will-continue-to-support-india-as-strategic-partner-us/articleshow/106653000.cms';
// (a sample Times of India URL)

async function testExtract() {
  console.log(`Testing extraction for URL: ${url}`);
  try {
    const response = await fetch('http://localhost:3000/api/analyze/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testExtract();
