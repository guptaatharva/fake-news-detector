// src/lib/puppeteerPool.ts
//
// Launching a brand-new headless Chromium process for every single scrape is
// slow and resource-heavy, and becomes a major bottleneck under concurrent
// load. This keeps one shared Browser instance alive across requests and
// hands out fresh Pages (tabs) from it, recycling the browser periodically
// (by age and use-count) so a single long-lived process can't leak memory
// indefinitely or get stuck after a crashed page.

import puppeteer, { type Browser, type Page } from 'puppeteer';

const MAX_USES_BEFORE_RECYCLE = 50;
const MAX_AGE_MS = 30 * 60 * 1000;

let browserPromise: Promise<Browser> | null = null;
let useCount = 0;
let launchedAt = 0;

async function launchBrowser(): Promise<Browser> {
  const browser = await puppeteer.launch({
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
  useCount = 0;
  launchedAt = Date.now();
  browser.on('disconnected', () => {
    // The shared browser died (crashed/killed) — force the next caller to relaunch.
    browserPromise = null;
  });
  return browser;
}

async function getSharedBrowser(): Promise<Browser> {
  const needsRecycle = useCount >= MAX_USES_BEFORE_RECYCLE || Date.now() - launchedAt >= MAX_AGE_MS;

  if (browserPromise && needsRecycle) {
    const stale = browserPromise;
    browserPromise = null;
    stale.then((b) => b.close().catch(() => {})).catch(() => {});
  }

  if (!browserPromise) {
    browserPromise = launchBrowser();
  }

  return browserPromise;
}

/** Acquires a fresh Page from the shared, pooled Browser instance. */
export async function acquirePage(): Promise<{ page: Page; release: () => Promise<void> }> {
  const browser = await getSharedBrowser();
  useCount += 1;
  const page = await browser.newPage();
  return {
    page,
    release: async () => {
      try {
        await page.close();
      } catch {
        // ignore close errors — page may already be gone if the browser crashed
      }
    },
  };
}

/** Explicitly tears down the shared browser (used by tests / graceful shutdown). */
export async function closeSharedBrowser(): Promise<void> {
  if (browserPromise) {
    const p = browserPromise;
    browserPromise = null;
    try {
      const browser = await p;
      await browser.close();
    } catch {
      // ignore
    }
  }
}
