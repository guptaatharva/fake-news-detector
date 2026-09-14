const url = 'https://timesofindia.indiatimes.com/india/e-rickshaw-shutdown-prank-centre-tells-google-apple-to-remove-7-apps-from-their-stores/articleshow/132163709.cms';

async function testFlow() {
  try {
    console.log('Sending request to /api/analyze/extract...');
    const extractRes = await fetch('http://localhost:3000/api/analyze/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!extractRes.ok) {
      console.error('Extract failed:', await extractRes.text());
      return;
    }
    
    const extractData = await extractRes.json();
    console.log('Extract Result:', JSON.stringify(extractData, null, 2).substring(0, 500) + '...');
    
    console.log('Sending request to /api/analyze/synthesize...');
    const evidenceContext = `Mock evidence: Fact check says this prank app thing actually happened according to news.`;
    const synthesizeRes = await fetch('http://localhost:3000/api/analyze/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        originalText: extractData.originalText, 
        evidenceContext 
      })
    });

    if (!synthesizeRes.ok) {
      console.error('Synthesize failed:', await synthesizeRes.text());
      return;
    }

    const synthesizeData = await synthesizeRes.json();
    console.log('Synthesize Result:', JSON.stringify(synthesizeData, null, 2));

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testFlow();
