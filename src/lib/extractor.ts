import puppeteer, { type Browser, type Page } from 'puppeteer';
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  /** The cleaned article text */
  text: string;
  /** Which extraction tier succeeded: 'fetch', 'puppeteer', 'fallback-body' */
  method: 'fetch' | 'puppeteer' | 'fallback-body';
  /** Total characters extracted before truncation */
  rawLength: number;
  /** Whether a fallback tier was used after an earlier tier failed */
  usedFallback: boolean;
  /** Whether the content passed quality validation */
  qualityOk: boolean;
  /** Diagnostic details for server-side logging */
  diagnostics: ExtractionDiagnostics;
}

export interface ExtractionDiagnostics {
  url: string;
  finalUrl: string;
  httpStatus: number | null;
  navigationDurationMs: number | null;
  navigationTimedOut: boolean;
  extractedCharCount: number;
  method: string;
  tiersAttempted: string[];
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 15_000;
const MIN_QUALITY_LENGTH = 150;
const FETCH_TIMEOUT_MS = 12_000;
const PUPPETEER_NAV_TIMEOUT_MS = 15_000;
const PUPPETEER_CONTENT_WAIT_MS = 3_000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Domains / URL patterns to block in Puppeteer request interception.
 * These fire continuously and prevent networkidle from ever settling.
 */
const BLOCKED_URL_PATTERNS: RegExp[] = [
  // Analytics & tag managers
  /google-analytics\.com/i,
  /googletagmanager\.com/i,
  /analytics\./i,
  /gtag/i,
  /ga\.js/i,
  /collect\?/i,
  // Ad networks
  /doubleclick\.net/i,
  /googlesyndication\.com/i,
  /googleadservices\.com/i,
  /adservice\.google/i,
  /amazon-adsystem\.com/i,
  /adnxs\.com/i,
  /adsrvr\.org/i,
  /criteo\./i,
  /taboola\.com/i,
  /outbrain\.com/i,
  /mgid\.com/i,
  /moatads\.com/i,
  /scorecardresearch\.com/i,
  // Social widgets & trackers
  /facebook\.net/i,
  /facebook\.com\/tr/i,
  /connect\.facebook/i,
  /platform\.twitter/i,
  /platform\.instagram/i,
  /linkedin\.com\/px/i,
  /snap\.licdn\.com/i,
  // Tracking pixels / beacons
  /pixel\./i,
  /beacon\./i,
  /t\.co\//i,
  /bat\.bing\.com/i,
  /hotjar\.com/i,
  /clarity\.ms/i,
  /fullstory\.com/i,
  /newrelic\.com/i,
  /nr-data\.net/i,
  /sentry\.io/i,
  // Other heavy third-party
  /chartbeat\.com/i,
  /comscore\.com/i,
  /quantserve\.com/i,
  /optimizely\.com/i,
  /cdn\.ampproject\.org/i,
];

/** Resource types to block outright in Puppeteer */
const BLOCKED_RESOURCE_TYPES = new Set([
  'image',
  'media',
  'font',
  'stylesheet',
  'texttrack',
  'eventsource',
  'websocket',
  'manifest',
]);

/**
 * Selectors whose text content is almost certainly boilerplate, not article.
 * We remove these nodes before extraction.
 */
const BOILERPLATE_SELECTORS = [
  'nav',
  'header',
  'footer',
  '.nav',
  '.navbar',
  '.header',
  '.footer',
  '.cookie-banner',
  '.cookie-consent',
  '.cookie-notice',
  '#cookie-banner',
  '#cookie-consent',
  '.ad',
  '.ads',
  '.advertisement',
  '.advert',
  '[class*="advert"]',
  '[id*="advert"]',
  '.social-share',
  '.social-widget',
  '.share-bar',
  '.share-buttons',
  '.related-stories',
  '.related-articles',
  '.recommended',
  '.trending',
  '.sidebar',
  '.comments',
  '.comment-section',
  '#comments',
  '.newsletter-signup',
  '.subscribe',
  '.popup',
  '.modal',
  '.overlay',
  '.breadcrumb',
  '.breadcrumbs',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="contentinfo"]',
];

/**
 * Common article content selectors to look for when waiting for content.
 * If any of these exist in the DOM, the page has likely loaded enough.
 */
const ARTICLE_SELECTORS = [
  'article',
  '[role="article"]',
  '.article-body',
  '.article-content',
  '.story-content',
  '.story-body',
  '.post-content',
  '.entry-content',
  '.content-body',
  '.article_content',
  '.Normal', // TOI specific
  '#article-body',
  'main',
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract readable article text from a URL using a three-tier strategy:
 * 1. Lightweight fetch + Readability (fast, no browser)
 * 2. Puppeteer with aggressive blocking (for JS-rendered content)
 * 3. Raw body text extraction with boilerplate removal (last resort)
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  const result = await extractWithDiagnostics(url);

  // Log structured diagnostics server-side
  logDiagnostics(result.diagnostics);

  if (!result.qualityOk && result.text.length < MIN_QUALITY_LENGTH) {
    throw new Error(
      'Unable to extract meaningful article content from this URL. ' +
      'The page may be behind a paywall, require a login, or contain no readable article text.'
    );
  }

  return result.text;
}

/**
 * Full extraction with diagnostics — used by the scrape route for richer responses.
 */
export async function extractWithDiagnostics(url: string): Promise<ExtractionResult> {
  const diagnostics: ExtractionDiagnostics = {
    url,
    finalUrl: url,
    httpStatus: null,
    navigationDurationMs: null,
    navigationTimedOut: false,
    extractedCharCount: 0,
    method: 'none',
    tiersAttempted: [],
    error: null,
  };

  // --- Tier 1: Lightweight fetch + Readability ---
  try {
    diagnostics.tiersAttempted.push('fetch');
    const result = await extractViaFetch(url, diagnostics);
    if (result) {
      return result;
    }
  } catch (e: any) {
    console.warn(`[Scraper] Tier 1 (fetch) failed for ${url}: ${e.message}`);
  }

  // --- Tier 2: Puppeteer with aggressive blocking ---
  try {
    diagnostics.tiersAttempted.push('puppeteer');
    const result = await extractViaPuppeteer(url, diagnostics);
    if (result) {
      return result;
    }
  } catch (e: any) {
    console.warn(`[Scraper] Tier 2 (puppeteer) failed for ${url}: ${e.message}`);
  }

  // If we got here, nothing worked
  diagnostics.error = 'All extraction tiers failed or returned insufficient content.';
  return {
    text: '',
    method: 'fallback-body',
    rawLength: 0,
    usedFallback: true,
    qualityOk: false,
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Tier 1: Fetch + Readability
// ---------------------------------------------------------------------------

async function extractViaFetch(
  url: string,
  diagnostics: ExtractionDiagnostics,
): Promise<ExtractionResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn(`[Scraper] Fetch timed out after ${FETCH_TIMEOUT_MS}ms for ${url}`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  diagnostics.httpStatus = response.status;
  diagnostics.finalUrl = response.url || url;
  diagnostics.navigationDurationMs = Date.now() - startTime;

  if (!response.ok) {
    console.warn(`[Scraper] Fetch returned HTTP ${response.status} for ${url}`);
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    console.warn(`[Scraper] Non-HTML content-type "${contentType}" for ${url}`);
    return null;
  }

  const html = await response.text();
  if (!html || html.length < 500) {
    console.warn(`[Scraper] Fetch returned very short HTML (${html.length} chars) for ${url}`);
    return null;
  }

  // Parse with JSDOM + Readability
  const extracted = parseHtmlToArticle(html, diagnostics.finalUrl);
  if (!extracted) {
    return null;
  }

  const cleaned = cleanText(extracted);
  const qualityOk = validateContentQuality(cleaned);
  const truncated = cleaned.substring(0, MAX_TEXT_LENGTH);

  diagnostics.extractedCharCount = cleaned.length;
  diagnostics.method = 'fetch';

  // If fetch-based extraction is too short or low quality, let Tier 2 try
  if (!qualityOk) {
    console.warn(`[Scraper] Fetch extraction quality check failed (${cleaned.length} chars) for ${url}`);
    return null;
  }

  return {
    text: truncated,
    method: 'fetch',
    rawLength: cleaned.length,
    usedFallback: false,
    qualityOk,
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Tier 2: Puppeteer
// ---------------------------------------------------------------------------

async function extractViaPuppeteer(
  url: string,
  diagnostics: ExtractionDiagnostics,
): Promise<ExtractionResult | null> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--mute-audio',
        '--hide-scrollbars',
        '--ignore-certificate-errors',
      ],
    });

    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(USER_AGENT);

    // Enable request interception for aggressive blocking
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const reqUrl = req.url();

      // Block non-essential resource types
      if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
        req.abort('blockedbyclient');
        return;
      }

      // Block known analytics/ads/tracking domains
      if (BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(reqUrl))) {
        req.abort('blockedbyclient');
        return;
      }

      req.continue();
    });

    // Suppress console noise from the page
    page.on('pageerror', () => { /* suppress page JS errors */ });
    page.on('error', () => { /* suppress page crash errors */ });

    // Navigate with domcontentloaded — don't wait for all resources
    const startTime = Date.now();
    let navigationTimedOut = false;
    let httpStatus: number | null = null;

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: PUPPETEER_NAV_TIMEOUT_MS,
      });
      httpStatus = response?.status() ?? null;
      diagnostics.finalUrl = response?.url() || url;
    } catch (navError: any) {
      navigationTimedOut = true;
      console.warn(
        `[Scraper] Puppeteer navigation timed out after ${PUPPETEER_NAV_TIMEOUT_MS}ms for ${url}, ` +
        `proceeding with partially loaded content...`
      );
    }

    diagnostics.navigationDurationMs = Date.now() - startTime;
    diagnostics.navigationTimedOut = navigationTimedOut;
    diagnostics.httpStatus = httpStatus ?? diagnostics.httpStatus;

    // After DOM is loaded, wait briefly for article content to render (JS-heavy sites)
    try {
      await waitForArticleContent(page, PUPPETEER_CONTENT_WAIT_MS);
    } catch {
      // Not finding article selectors is acceptable; we'll try body text
    }

    // Get the rendered HTML
    const html = await page.content();

    if (!html || html.length < 200) {
      console.warn(`[Scraper] Puppeteer got very short HTML (${html.length} chars) for ${url}`);
      return null;
    }

    // Try Readability first
    let extracted = parseHtmlToArticle(html, diagnostics.finalUrl);
    let method: ExtractionResult['method'] = 'puppeteer';

    // Fallback: raw body text with boilerplate removal (Tier 3)
    if (!extracted || !validateContentQuality(extracted)) {
      diagnostics.tiersAttempted.push('fallback-body');
      extracted = extractBodyTextWithCleanup(html, diagnostics.finalUrl);
      method = 'fallback-body';
    }

    if (!extracted) {
      return null;
    }

    const cleaned = cleanText(extracted);
    const qualityOk = validateContentQuality(cleaned);
    const truncated = cleaned.substring(0, MAX_TEXT_LENGTH);

    diagnostics.extractedCharCount = cleaned.length;
    diagnostics.method = method;

    return {
      text: truncated,
      method,
      rawLength: cleaned.length,
      usedFallback: method === 'fallback-body',
      qualityOk,
      diagnostics,
    };
  } finally {
    // Guaranteed cleanup — close page then browser
    try {
      if (page) await page.close();
    } catch { /* ignore close errors */ }
    try {
      if (browser) await browser.close();
    } catch { /* ignore close errors */ }
  }
}

/**
 * Wait for any common article content selector to appear in the DOM.
 * Returns as soon as one is found, or times out silently.
 */
async function waitForArticleContent(page: Page, timeoutMs: number): Promise<void> {
  const selectorList = ARTICLE_SELECTORS.join(', ');
  await page.waitForSelector(selectorList, { timeout: timeoutMs });
}

// ---------------------------------------------------------------------------
// HTML → Article Text Parsing
// ---------------------------------------------------------------------------

/**
 * Parse raw HTML into article text using JSDOM + Readability.
 * Suppresses CSS parsing warnings.
 */
function parseHtmlToArticle(html: string, url: string): string | null {
  // Create a virtual console that suppresses CSS parse warnings
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => { /* suppress JSDOM errors like CSS parse failures */ });

  const dom = new JSDOM(html, {
    url,
    virtualConsole,
    // Don't run scripts or load external resources in JSDOM
    runScripts: undefined,
    resources: undefined,
    pretendToBeVisual: false,
  });

  const document = dom.window.document;

  // Remove boilerplate elements before Readability processes them
  removeBoilerplateElements(document);

  const reader = new Readability(document);
  const article = reader.parse();

  dom.window.close();

  if (!article || !article.textContent || article.textContent.trim().length < 100) {
    return null;
  }

  return article.textContent;
}

/**
 * Tier 3 fallback: extract all text from the body, after removing boilerplate elements.
 */
function extractBodyTextWithCleanup(html: string, url: string): string | null {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => { /* suppress */ });

  const dom = new JSDOM(html, {
    url,
    virtualConsole,
    runScripts: undefined,
    resources: undefined,
    pretendToBeVisual: false,
  });

  const document = dom.window.document;

  // Remove boilerplate
  removeBoilerplateElements(document);

  // Also remove script and style tags
  document.querySelectorAll('script, style, noscript, svg, iframe').forEach((el) => el.remove());

  const bodyText = document.body?.textContent || '';
  dom.window.close();

  if (bodyText.trim().length < 100) {
    return null;
  }

  return bodyText;
}

/**
 * Remove elements that are navigation, ads, social widgets, etc.
 */
function removeBoilerplateElements(document: Document): void {
  for (const selector of BOILERPLATE_SELECTORS) {
    try {
      document.querySelectorAll(selector).forEach((el) => el.remove());
    } catch {
      // Invalid selectors on some DOMs — skip silently
    }
  }
}

// ---------------------------------------------------------------------------
// Content Cleaning & Validation
// ---------------------------------------------------------------------------

/**
 * Clean extracted text: collapse whitespace, remove common junk patterns.
 */
function cleanText(raw: string): string {
  let text = raw;

  // Collapse all whitespace (newlines, tabs, multiple spaces) into single spaces
  text = text.replace(/\s+/g, ' ').trim();

  // Remove common inline junk patterns
  const junkPatterns = [
    /Accept\s*(All\s*)?Cookies?/gi,
    /We\s*use\s*cookies\s*to\s*.{0,200}/gi,
    /This\s*site\s*uses\s*cookies\s*.{0,200}/gi,
    /Subscribe\s*to\s*our\s*newsletter/gi,
    /Sign\s*up\s*for\s*our\s*newsletter/gi,
    /Download\s*our\s*app/gi,
    /Follow\s*us\s*on/gi,
    /Share\s*this\s*(article|story|post)/gi,
    /Read\s*more\s*at\s*/gi,
    /Advertisement\s*-?\s*/gi,
    /Sponsored\s*Content/gi,
    /Copyright\s*©?\s*\d{4}/gi,
    /All\s*rights?\s*reserved/gi,
    /Terms\s*(of\s*(Use|Service)|&\s*Conditions)/gi,
    /Privacy\s*Policy/gi,
  ];

  for (const pattern of junkPatterns) {
    text = text.replace(pattern, '').trim();
  }

  // Collapse any leftover multiple spaces from removals
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}

/**
 * Validate that extracted content is real article text, not boilerplate.
 */
function validateContentQuality(text: string): boolean {
  if (!text || text.length < MIN_QUALITY_LENGTH) {
    return false;
  }

  // Check average word length — real prose has average word length ~4-7 chars
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length < 30) {
    return false; // Too few words for a real article
  }

  const avgWordLen = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  if (avgWordLen < 2 || avgWordLen > 20) {
    return false; // Likely junk or encoded content
  }

  // Check for excessive short "words" that indicate navigation text (e.g., "Home | News | Sports")
  const veryShortWords = words.filter((w) => w.length <= 2).length;
  const shortWordRatio = veryShortWords / words.length;
  if (shortWordRatio > 0.5) {
    return false; // More than half the "words" are ≤2 chars — likely nav/menu text
  }

  return true;
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function logDiagnostics(d: ExtractionDiagnostics): void {
  const logParts = [
    `[Scraper] Extraction complete`,
    `url=${d.url}`,
    `finalUrl=${d.finalUrl}`,
    `method=${d.method}`,
    `tiers=${d.tiersAttempted.join('→')}`,
    `httpStatus=${d.httpStatus ?? 'N/A'}`,
    `navDuration=${d.navigationDurationMs != null ? d.navigationDurationMs + 'ms' : 'N/A'}`,
    `navTimeout=${d.navigationTimedOut}`,
    `extractedChars=${d.extractedCharCount}`,
  ];
  if (d.error) {
    logParts.push(`error=${d.error}`);
  }
  console.log(logParts.join(' | '));
}
