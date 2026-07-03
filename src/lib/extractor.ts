import puppeteer from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export async function extractTextFromUrl(url: string): Promise<string> {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    
    // Set a common user agent to bypass simple blocks
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    
    // Abort requests for images, stylesheets, media to speed up extraction
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Go to the URL and wait until the network is mostly idle
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.warn(`page.goto timed out or failed for ${url}, attempting to proceed with loaded content...`);
    }
    
    // Get the full HTML content
    const html = await page.content();
    
    // Parse the HTML with JSDOM
    const doc = new JSDOM(html, { url });
    
    // Use Mozilla Readability to extract the main article content
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    let text = '';
    if (!article || !article.textContent) {
      console.warn('Readability failed to extract article, falling back to body text.');
      let bodyText = doc.window.document.body?.textContent || '';
      if (!bodyText.trim()) {
        throw new Error('Readability failed and fallback body text is empty.');
      }
      text = bodyText;
    } else {
      text = article.textContent;
    }
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Return max 15000 characters to avoid huge payloads
    return text.substring(0, 15000);
  } catch (error: any) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text from the provided URL. Details: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
