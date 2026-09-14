import puppeteer from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import fs from 'fs';

async function test() {
  const url = 'https://timesofindia.indiatimes.com/india/e-rickshaw-shutdown-prank-centre-tells-google-apple-to-remove-7-apps-from-their-stores/articleshow/132163709.cms';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'media', 'font'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.warn(`page.goto timed out`);
  }
  
  const html = await page.content();
  console.log("HTML length:", html.length);
  
  const doc = new JSDOM(html, { url });
  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  
  console.log("Readability article extracted:", !!article);
  if (article) {
    console.log("Article length:", article.textContent?.length);
  } else {
    console.log("Readability failed.");
  }
  
  let bodyText = doc.window.document.body?.textContent || '';
  console.log("Body text length:", bodyText.length);
  
  fs.writeFileSync('test_toi.html', html);
  console.log('HTML saved to test_toi.html');
  
  await browser.close();
}

test().catch(console.error);
