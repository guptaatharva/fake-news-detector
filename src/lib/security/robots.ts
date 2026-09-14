// src/lib/security/robots.ts
//
// Minimal robots.txt compliance check. Before scraping any URL we fetch and
// parse its robots.txt and skip the page if disallowed for our user agent (or
// the wildcard group) — both a good-citizenship practice and a legal-risk
// reducer for a public-facing scraper. This is intentionally a lightweight
// parser covering the common User-agent/Disallow/Allow directives rather than
// the full RFC 9309 grammar (no crawl-delay, sitemap, or wildcard/`$` path
// matching beyond simple prefix matching), which covers the overwhelming
// majority of real-world robots.txt files.

const OUR_USER_AGENT_TOKEN = 'VeraCiusAI';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface RobotsRules {
  disallow: string[];
  allow: string[];
}

interface CacheEntry {
  rules: RobotsRules | null; // null = no restrictions (missing/unreadable robots.txt)
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

function parseRobotsTxt(text: string, userAgentToken: string): RobotsRules {
  const lines = text.split(/\r?\n/);
  const groups: Array<{ agents: string[]; disallow: string[]; allow: string[] }> = [];
  let current: { agents: string[]; disallow: string[]; allow: string[] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const field = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (field === 'user-agent') {
      if (!current || current.disallow.length > 0 || current.allow.length > 0) {
        current = { agents: [value], disallow: [], allow: [] };
        groups.push(current);
      } else {
        current.agents.push(value);
      }
    } else if (field === 'disallow' && current) {
      if (value) current.disallow.push(value);
    } else if (field === 'allow' && current) {
      if (value) current.allow.push(value);
    }
  }

  const specific = groups.find((g) => g.agents.some((a) => a.toLowerCase() === userAgentToken.toLowerCase()));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  const chosen = specific || wildcard;

  return { disallow: chosen?.disallow || [], allow: chosen?.allow || [] };
}

async function getRobotsRules(origin: string): Promise<RobotsRules | null> {
  const cached = cache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rules;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${origin}/robots.txt`, {
      signal: controller.signal,
      headers: { 'User-Agent': `${OUR_USER_AGENT_TOKEN}-Research/1.0` },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      cache.set(origin, { rules: null, fetchedAt: Date.now() });
      return null;
    }

    const text = await res.text();
    const rules = parseRobotsTxt(text, OUR_USER_AGENT_TOKEN);
    cache.set(origin, { rules, fetchedAt: Date.now() });
    return rules;
  } catch {
    // Unreachable/missing robots.txt is treated as "no restrictions" — the
    // conservative-but-usable default most crawlers apply.
    cache.set(origin, { rules: null, fetchedAt: Date.now() });
    return null;
  }
}

/** Returns true if `url` is permitted to be fetched under the site's robots.txt. */
export async function isScrapingAllowed(url: string): Promise<boolean> {
  if (process.env.RESPECT_ROBOTS_TXT === 'false') return true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  const rules = await getRobotsRules(parsed.origin);
  if (!rules || rules.disallow.length === 0) return true;

  const path = parsed.pathname + parsed.search;

  const matchingDisallow = rules.disallow
    .filter((rule) => rule === '' || path.startsWith(rule))
    .sort((a, b) => b.length - a.length)[0];
  if (!matchingDisallow) return true;

  const matchingAllow = rules.allow
    .filter((rule) => path.startsWith(rule))
    .sort((a, b) => b.length - a.length)[0];

  if (matchingAllow && matchingAllow.length >= matchingDisallow.length) return true;

  return false;
}
