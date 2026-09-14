const { extractWithDiagnostics } = require('../src/lib/extractor.ts');

async function testScrape() {
  const testUrls = [
    'https://science.nasa.gov/mission/webb/',
    'https://timesofindia.indiatimes.com/world/us/us-elections-news-live-updates-september-2-2024/liveblog/113000000.cms'
  ];

  for (const url of testUrls) {
    console.log(`\nTesting scrape for: ${url}`);
    try {
      const res = await extractWithDiagnostics(url);
      console.log('Result:', {
        method: res.method,
        rawLength: res.rawLength,
        qualityOk: res.qualityOk,
        textSnippet: res.text.substring(0, 200),
        diagnostics: res.diagnostics
      });
    } catch (e) {
      console.error('Scrape error:', e);
    }
  }
}
// Note: need ts-node or run via Next.js or bundle
