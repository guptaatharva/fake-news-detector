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
      if (['image', 'stylesheet', 'media', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Go to the URL and wait until the network is mostly idle
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Get the full HTML content
    const html = await page.content();
    
    // Parse the HTML with JSDOM
    const doc = new JSDOM(html, { url });
    
    // Use Mozilla Readability to extract the main article content
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (!article || !article.textContent) {
      throw new Error('Readability failed to extract article text.');
    }
    
    let text = article.textContent;
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    // Return max 15000 characters to avoid huge payloads
    return text.substring(0, 15000);
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error('Failed to extract text from the provided URL.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
