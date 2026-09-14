const puppeteer = require('puppeteer');
const { Readability } = require('@mozilla/readability');
const { JSDOM, VirtualConsole } = require('jsdom');
const cheerio = require('cheerio');

async function resolveAndExtract(url) {
  console.log(`\n========================================`);
  console.log(`Extracting from URL: ${url}`);

  // If it's a Google News redirect URL, resolve with puppeteer or fetch
  let targetUrl = url;
  
  // Puppeteer extraction
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    
    // Block images, fonts, media, stylesheets for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (e) {
      console.log('Navigation timeout, checking loaded DOM...');
    }

    const finalUrl = page.url();
    console.log('Resolved final URL:', finalUrl);

    // Wait 2 seconds for JS rendering if needed
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    console.log('HTML length:', html.length);

    // Readability parse
    const vc = new VirtualConsole();
    vc.on('error', () => {});
    const dom = new JSDOM(html, { url: finalUrl, virtualConsole: vc });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.trim().length > 150) {
      console.log('Readability extraction succeeded!');
      console.log('Title:', article.title);
      console.log('Text length:', article.textContent.trim().length);
      console.log('Snippet:', article.textContent.trim().substring(0, 300));
      return article.textContent.trim();
    } else {
      console.log('Readability got short text, trying body/article fallback...');
      const bodyText = dom.window.document.body ? dom.window.document.body.textContent : '';
      console.log('Body fallback text length:', bodyText.trim().length);
      return bodyText.trim();
    }
  } catch (err) {
    console.error('Puppeteer extraction error:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

async function test() {
  const testUrl = 'https://news.google.com/rss/articles/CBMi-AFBVV95cUxOV3FTYnFSam1FN3g3MUdPaGR2MEJ0X3BwdE1QREs2NnY1Vkx2WXR5eU5YU0xKQTFjSGdnYVpCeW1rcFd2cXhzOEpId1RfNDRVbHltRFBaMFFZNlNRdkJDdjczOFp3RVdxYkZmSEgxUlBza2hLdDlTNGJ2QWNHbGxUSW82VEl3Zi1jY1FUZTlYaHRrU1NMTGJLeW05d2JqY3hsZzZhdndQYXZCTVhFY3drakJ4cFVBamN0YWJYeHVtUFg2M0xvTUhGNGYxWWc2ckxnWXlFZWhXYWRwTWE1cFNRNjRfd3BaNlNNdVZBZmZQRHlqRTNFWUNoZdIB_gFBVV95cUxQeUFGWGNwRWk5MWZXNGU5aUtXcjNWMXZiVHJlSldrVnhPa2xqc0tIcG0wWEJxS3JMTjdhQlBiaGRhbndZUHhZbFVzSm52bHNPSmNucGJ5LUt5djJnTlc5d2s1N1hMb1Q0Wm5Jb0Ewc3d1WWNtNjNCenZnWmZPVzg2VHo4NDRTOUZFM0owX2xlZy1yYVlKV24weWp0a0h5TWdnNkgtMHFEcllxOFpKTUdJRl9MUmtDdVIxTFQ2NmpRVkJSU1BUeGZqcF9OZmlqZkpiM1Q0ZlNBOVFCNEJFM3RMbXhjRU1ENFVzMmtoODNLSnRfSGc0LWYzTnpIWWdYdw?oc=5';
  await resolveAndExtract(testUrl);
}

test();
