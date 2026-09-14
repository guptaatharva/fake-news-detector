// src/lib/satire.ts
//
// A small curated list of well-known satire/parody news domains. Treating
// satire as "FALSE" (or worse, "verified false news") is a common false-positive
// failure mode for automated fact-checking tools — satire is not misinformation,
// it's clearly-intentioned humor that some readers share out of context. When a
// claim's dominant source is a known satire outlet, the pipeline labels it
// SATIRE instead of running it through the normal true/false verdict scale.

export const SATIRE_DOMAINS: Set<string> = new Set([
  'theonion.com',
  'babylonbee.com',
  'clickhole.com',
  'thedailymash.co.uk',
  'waterfordwhispersnews.com',
  'newsthump.com',
  'thebeaverton.com',
  'reductress.com',
  'private-eye.co.uk',
  'duffelblog.com',
  'thehardtimes.net',
  'satirewire.com',
  'thespoof.com',
  'unconfirmedsources.com',
  'thelastlineofdefense.org',
  'newsbiscuit.com',
]);

export function isSatireDomain(domain?: string): boolean {
  if (!domain) return false;
  const clean = domain.replace(/^www\./, '').toLowerCase().trim();
  return SATIRE_DOMAINS.has(clean);
}
