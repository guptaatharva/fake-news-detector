// src/lib/security/ssrf.ts
//
// The scrape route accepts an arbitrary URL and both fetch()s it and drives
// Puppeteer against it server-side. Without a guard, that's a server-side
// request forgery surface: a caller can point it at cloud metadata endpoints
// (169.254.169.254), localhost, or internal service ports. This module
// resolves the *actual* IP a hostname points to (not just string-matching the
// hostname, which DNS rebinding can defeat) and rejects anything private,
// loopback, link-local, or otherwise non-public before the request is made.

import dns from 'node:dns/promises';
import net from 'node:net';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set(['', '80', '443']);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.internal',
]);

/** IPv4 CIDR ranges that must never be reachable from the scraper. */
const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local / cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isBlockedIPv4(ip: string): boolean {
  const target = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, prefix]) => {
    const baseInt = ipv4ToInt(base);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (target & mask) === (baseInt & mask);
  });
}

function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true; // loopback
  if (normalized === '::') return true; // unspecified
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe80::')) return true; // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local (fc00::/7)
  if (normalized.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — check the embedded IPv4 address too.
    const mapped = normalized.split(':').pop() || '';
    if (net.isIPv4(mapped)) return isBlockedIPv4(mapped);
  }
  return false;
}

function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isBlockedIPv4(ip);
  if (net.isIPv6(ip)) return isBlockedIPv6(ip);
  return true; // unrecognized — fail closed
}

export interface SafeUrlResult {
  url: URL;
  resolvedIps: string[];
}

/**
 * Validates that `rawUrl` is safe to fetch/navigate server-side: http(s) only,
 * a standard port, and — critically — resolves to a public, non-internal IP
 * address. Throws UnsafeUrlError otherwise. Always resolve DNS and check the
 * resolved IP, never just the hostname string, since a hostname can be made
 * to resolve to an internal address (DNS rebinding).
 */
export async function assertSafeUrl(rawUrl: string): Promise<SafeUrlResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Invalid URL.');
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(`URL scheme "${url.protocol}" is not allowed. Only http/https are permitted.`);
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError('Non-standard ports are not allowed.');
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError('This host is not allowed.');
  }

  // If the hostname is itself a literal IP, validate it directly.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new UnsafeUrlError('This IP address is not allowed.');
    }
    return { url, resolvedIps: [hostname] };
  }

  let records: string[];
  try {
    const [v4, v6] = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)]);
    records = [
      ...(v4.status === 'fulfilled' ? v4.value : []),
      ...(v6.status === 'fulfilled' ? v6.value : []),
    ];
  } catch {
    records = [];
  }

  if (records.length === 0) {
    throw new UnsafeUrlError('Could not resolve this host.');
  }

  const blocked = records.filter(isBlockedIp);
  if (blocked.length > 0) {
    throw new UnsafeUrlError('This host resolves to a private or internal network address and cannot be fetched.');
  }

  return { url, resolvedIps: records };
}
