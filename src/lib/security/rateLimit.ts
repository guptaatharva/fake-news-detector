// src/lib/security/rateLimit.ts
//
// A dependency-free, in-process token-bucket rate limiter. This protects the
// NVIDIA/GNews-backed /api/analyze/* routes from being hammered by an
// unauthenticated or scripted client and burning through paid API quota.
//
// Limitation: state lives in the Node process's memory, so on a
// multi-instance/serverless deployment each instance enforces its own limit
// independently rather than a single global one. That's an acceptable
// stopgap for a single-instance deployment; for horizontally-scaled
// production traffic, swap `MemoryRateLimitStore` below for a shared store
// backed by Upstash Redis (`@upstash/ratelimit`) — the `RateLimitStore`
// interface is deliberately small so that's a drop-in change, not a rewrite.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number): RateLimitResult;
}

interface Bucket {
  tokens: number;
  windowStart: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();

  consume(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { tokens: limit, windowStart: now };
      this.buckets.set(key, bucket);
    }

    const resetAt = bucket.windowStart + windowMs;

    if (bucket.tokens <= 0) {
      return { allowed: false, remaining: 0, resetAt };
    }

    bucket.tokens -= 1;
    return { allowed: true, remaining: bucket.tokens, resetAt };
  }

  /** Clears buckets older than maxAgeMs to reclaim memory in long-running processes */
  sweepStale(maxAgeMs = 30 * 60 * 1000): number {
    const now = Date.now();
    let swept = 0;
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.windowStart > maxAgeMs) {
        this.buckets.delete(key);
        swept++;
      }
    }
    return swept;
  }

  /** For test assertions */
  get size(): number {
    return this.buckets.size;
  }
}

// Periodically sweep stale buckets so long-running processes don't leak memory.
const store = new MemoryRateLimitStore();
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    store.sweepStale();
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  /** Logical bucket name, e.g. 'analyze:extract'. */
  scope: string;
  /** Caller identity — prefer a signed-in user id; fall back to IP. */
  identity: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const key = `${options.scope}:${options.identity}`;
  return store.consume(key, options.limit, options.windowMs);
}

/** Best-effort client IP extraction from standard proxy headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
