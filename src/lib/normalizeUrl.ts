// src/lib/normalizeUrl.ts
//
// Canonicalizes a URL so two links that point at the same article compare
// equal for cross-user result caching (#9 in REMAINING.md — "two people
// checking the same viral article right now get two independently-run
// verdicts instead of one cached, consistent one"). Purely local string
// processing — no network calls, no external service.

// Common tracking/session params that don't change what page loads. Stripped
// so "example.com/a?utm_source=twitter" and "example.com/a" dedup together.
const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "utm_name",
  "gclid", "fbclid", "msclkid", "twclid", "igshid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url", "referrer", "source",
  "spm", "si", "feature", "cmpid", "ito", "icid",
]);

/**
 * Returns a canonical form of `rawUrl` for equality comparison, or null if
 * the input isn't a valid http(s) URL. Not meant to be displayed or
 * dereferenced — only compared against another value produced by this same
 * function.
 */
export function normalizeUrlForDedup(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;

  let parsed: URL;
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!host) return null;

  let pathname = parsed.pathname.replace(/\/+$/, "");
  if (!pathname) pathname = "/";

  const keptParams: Array<[string, string]> = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) continue;
    keptParams.push([key, value]);
  }
  keptParams.sort(([a], [b]) => a.localeCompare(b));
  const query = keptParams.map(([k, v]) => `${k}=${v}`).join("&");

  return `${host}${pathname}${query ? `?${query}` : ""}`;
}
