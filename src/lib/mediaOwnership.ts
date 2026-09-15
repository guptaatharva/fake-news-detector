// src/lib/mediaOwnership.ts
//
// Source Independence & Media Conglomerate Grouping (§3.9 & H-6):
// When verifying claims, multiple URLs or subdomains belonging to the same media
// conglomerate (e.g. Times of India + Economic Times, or WSJ + NYPost, or
// News18 + Moneycontrol) must NOT be counted as independent corroborating sources.
// This module maps domains to their parent news organization so the confidence
// engine only rewards genuine cross-organizational corroboration.

const CONGLOMERATE_MAP: Record<string, string> = {
  // Times Group (Bennett, Coleman & Co. Ltd.)
  'indiatimes.com': 'times-group',
  'timesofindia.indiatimes.com': 'times-group',
  'economictimes.indiatimes.com': 'times-group',
  'navbharattimes.indiatimes.com': 'times-group',
  'mumbaimirror.indiatimes.com': 'times-group',
  'timesnownews.com': 'times-group',

  // Network18 / Reliance Industries
  'news18.com': 'network18',
  'moneycontrol.com': 'network18',
  'firstpost.com': 'network18',
  'cnbctv18.com': 'network18',
  'ibnlive.com': 'network18',

  // HT Media
  'hindustantimes.com': 'ht-media',
  'livemint.com': 'ht-media',
  'desimartini.com': 'ht-media',

  // Adani Media (AMG Media Networks)
  'ndtv.com': 'adani-media',
  'ndtvprofit.com': 'adani-media',
  'thequint.com': 'adani-media',
  'bqprime.com': 'adani-media',

  // India Today Group (Living Media)
  'indiatoday.in': 'india-today-group',
  'aajtak.in': 'india-today-group',
  'businesstoday.in': 'india-today-group',
  'dailyo.in': 'india-today-group',

  // Indian Express Group
  'indianexpress.com': 'indian-express-group',
  'financialexpress.com': 'indian-express-group',
  'jansatta.com': 'indian-express-group',

  // News Corp / Dow Jones
  'wsj.com': 'news-corp',
  'nypost.com': 'news-corp',
  'marketwatch.com': 'news-corp',
  'barrons.com': 'news-corp',
  'thetimes.co.uk': 'news-corp',
  'thesun.co.uk': 'news-corp',
  'theaustralian.com.au': 'news-corp',

  // Fox Corporation
  'foxnews.com': 'fox-corp',
  'foxbusiness.com': 'fox-corp',

  // Warner Bros. Discovery
  'cnn.com': 'wbd-cnn',
  'bleacherreport.com': 'wbd-cnn',

  // NBCUniversal / Comcast
  'nbcnews.com': 'nbcuniversal',
  'cnbc.com': 'nbcuniversal',
  'msnbc.com': 'nbcuniversal',
  'today.com': 'nbcuniversal',

  // The New York Times Company
  'nytimes.com': 'nyt-co',
  'theathletic.com': 'nyt-co',

  // Paramount Global
  'cbsnews.com': 'paramount-cbs',
  'cbs.com': 'paramount-cbs',

  // DMGT (Daily Mail and General Trust)
  'dailymail.co.uk': 'dmgt',
  'mailonsunday.co.uk': 'dmgt',
  'inews.co.uk': 'dmgt',
  'metro.co.uk': 'dmgt',

  // Reach plc
  'mirror.co.uk': 'reach-plc',
  'express.co.uk': 'reach-plc',
  'dailystar.co.uk': 'reach-plc',

  // Axel Springer
  'politico.com': 'axel-springer',
  'politico.eu': 'axel-springer',
  'businessinsider.com': 'axel-springer',
  'insider.com': 'axel-springer',
  'welt.de': 'axel-springer',
  'bild.de': 'axel-springer',
};

/**
 * Normalizes a URL or raw domain string down to a clean hostname.
 */
export function normalizeDomain(rawDomainOrUrl: string): string {
  if (!rawDomainOrUrl) return '';
  let str = rawDomainOrUrl.trim().toLowerCase();

  // If passed a full URL, parse hostname
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      str = new URL(str).hostname;
    } catch {
      // ignore
    }
  }

  // Remove leading www. and trailing slashes/ports
  return str.replace(/^www\./, '').split(':')[0].split('/')[0];
}

/**
 * Resolves the parent publisher/conglomerate entity for a domain.
 * If not in the known conglomerate registry, falls back to the registered root domain
 * (e.g. `sub.reuters.com` -> `reuters.com`).
 */
export function getPublisherEntity(rawDomainOrUrl: string): string {
  const domain = normalizeDomain(rawDomainOrUrl);
  if (!domain) return 'unknown';

  // Direct conglomerate match
  if (CONGLOMERATE_MAP[domain]) {
    return CONGLOMERATE_MAP[domain];
  }

  // Check if any registered parent domain is a suffix (e.g., indiatimes.com)
  for (const [parentDomain, group] of Object.entries(CONGLOMERATE_MAP)) {
    if (domain.endsWith(`.${parentDomain}`)) {
      return group;
    }
  }

  // Fallback: extract root domain (handling common 2-part TLDs like .co.uk, .com.au)
  const parts = domain.split('.');
  if (parts.length >= 3) {
    const secondLast = parts[parts.length - 2];
    const twoPartTlds = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);
    if (twoPartTlds.has(secondLast)) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  }

  return domain;
}

/**
 * Counts the number of genuinely independent media entities among a set of domains.
 */
export function countIndependentPublishers(domains: string[]): number {
  const entities = new Set(
    domains
      .map(getPublisherEntity)
      .filter((e) => e && e !== 'unknown')
  );
  return entities.size;
}

/**
 * Returns whether a set of evidence sources lacks true publisher diversity
 * (i.e. fewer than 2 genuinely independent news organizations).
 */
export function hasLowPublisherDiversity(domains: string[]): boolean {
  return countIndependentPublishers(domains) < 2;
}
