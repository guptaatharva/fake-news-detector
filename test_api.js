const url = 'https://timesofindia.indiatimes.com/india/e-rickshaw-shutdown-prank-centre-tells-google-apple-to-remove-7-apps-from-their-stores/articleshow/132163709.cms';

async function test() {
  try {
    console.log('Sending request to /api/analyze/extract...');
    const res = await fetch('http://localhost:3000/api/analyze/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
