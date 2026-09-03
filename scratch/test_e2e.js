async function runEndToEndVerification() {
  console.log('=====================================================');
  console.log('STARTING END-TO-END FACT-CHECKING PIPELINE TEST');
  console.log('=====================================================\n');

  const testArticleText = `NASA's James Webb Space Telescope recently detected water vapor in the atmosphere of the rocky exoplanet GJ 486 b. Scientists are currently investigating whether the water signal originates from the planet's atmosphere or from starspots on its host red dwarf star.`;

  // Step 1: Claim Extraction via Gemini
  console.log('--- STEP 1: EXTRACT CLAIMS ---');
  const extractRes = await fetch('http://localhost:3001/api/analyze/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testArticleText })
  });
  console.log('Extract API status:', extractRes.status);
  const extractData = await extractRes.json();
  console.log('Extracted Claims:', extractData.claims);

  if (!extractData.claims || extractData.claims.length === 0) {
    throw new Error('No claims extracted');
  }

  // Step 2: Live Web Search for Claims
  console.log('\n--- STEP 2: SEARCH FOR LIVE WEB SOURCES ---');
  const claim = extractData.claims[0];
  console.log(`Searching for claim: "${claim}"`);
  
  const searchRes = await fetch('http://localhost:3001/api/analyze/search-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim })
  });
  console.log('Search API status:', searchRes.status);
  const searchData = await searchRes.json();
  console.log(`Discovered ${searchData.results?.length || 0} search results:`);
  (searchData.results || []).forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.domain} | ${r.title} | ${r.link}`);
  });

  if (!searchData.results || searchData.results.length === 0) {
    throw new Error('No search results found');
  }

  // Step 3: Scrape & Extract Full Content
  console.log('\n--- STEP 3: SCRAPE AND EXTRACT REAL CONTENT ---');
  let evidenceContext = `--- Evidence for claim: "${claim}" ---\n`;
  let acceptedCount = 0;

  for (const item of searchData.results) {
    console.log(`\nScraping candidate: ${item.domain} (${item.link})`);
    try {
      const scrapeRes = await fetch('http://localhost:3001/api/analyze/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.link })
      });
      console.log(`Scrape HTTP status: ${scrapeRes.status}`);
      const scrapeData = await scrapeRes.json();

      if (scrapeRes.ok && scrapeData.text && scrapeData.text.length >= 150) {
        console.log(`SUCCESS: Extracted ${scrapeData.text.length} characters from ${item.domain}`);
        console.log(`Preview: "${scrapeData.text.substring(0, 180)}..."`);
        evidenceContext += `Source URL: ${item.link}\nPublisher: ${item.domain}\nTitle: ${item.title}\nExtracted Article Text:\n${scrapeData.text.substring(0, 2000)}\n\n`;
        acceptedCount++;
      } else {
        console.log(`REJECTED: ${item.domain} - ${scrapeData.error || 'Too short'}`);
      }
    } catch (e) {
      console.log(`FAILED: ${item.domain} - ${e.message}`);
    }
  }

  console.log(`\nTotal Independent Sources Successfully Extracted: ${acceptedCount}`);

  // Step 4: Synthesize Verdict with Gemini 3.7
  console.log('\n--- STEP 4: SYNTHESIZE VERDICT VIA GEMINI 3.7 ---');
  const synthRes = await fetch('http://localhost:3001/api/analyze/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalText: testArticleText,
      evidenceContext: evidenceContext
    })
  });
  console.log('Synthesize API status:', synthRes.status);
  const synthData = await synthRes.json();
  console.log('\nFINAL SYNTHESIS RESULT:');
  console.log('Verdict:', synthData.verdict);
  console.log('Confidence Score:', synthData.confidenceScore);
  console.log('Score Breakdown:', synthData.scoreBreakdown);
  console.log('Summary:', synthData.summary);
  console.log('Claims Verified:', JSON.stringify(synthData.claims, null, 2));

  console.log('\n=====================================================');
  console.log('END-TO-END FACT-CHECKING PIPELINE TEST COMPLETED SUCCESSFULLY');
  console.log('=====================================================');
}

runEndToEndVerification().catch(err => {
  console.error('\nE2E Test Failed:', err);
  process.exit(1);
});
