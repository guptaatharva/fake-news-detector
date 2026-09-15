import { describe, it, expect } from 'vitest';
import { checkRateLimit } from './rateLimit';

describe('checkRateLimit', () => {
  it('allows requests up to the limit', () => {
    const scope = `test-scope-${Math.random()}`;
    const r1 = checkRateLimit({ scope, identity: 'user-a', limit: 2, windowMs: 60_000 });
    const r2 = checkRateLimit({ scope, identity: 'user-a', limit: 2, windowMs: 60_000 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it('rejects the request once the limit is exceeded within the window', () => {
    const scope = `test-scope-${Math.random()}`;
    checkRateLimit({ scope, identity: 'user-b', limit: 1, windowMs: 60_000 });
    const second = checkRateLimit({ scope, identity: 'user-b', limit: 1, windowMs: 60_000 });
    expect(second.allowed).toBe(false);
  });

  it('tracks separate identities independently', () => {
    const scope = `test-scope-${Math.random()}`;
    checkRateLimit({ scope, identity: 'user-c', limit: 1, windowMs: 60_000 });
    const other = checkRateLimit({ scope, identity: 'user-d', limit: 1, windowMs: 60_000 });
    expect(other.allowed).toBe(true);
  });

  it('tracks separate scopes independently for the same identity', () => {
    checkRateLimit({ scope: 'scope-x', identity: 'shared-user', limit: 1, windowMs: 60_000 });
    const other = checkRateLimit({ scope: 'scope-y', identity: 'shared-user', limit: 1, windowMs: 60_000 });
    expect(other.allowed).toBe(true);
  });

  it('sweeps stale buckets correctly', async () => {
    const { MemoryRateLimitStore } = await import('./rateLimit');
    const customStore = new MemoryRateLimitStore();
    customStore.consume('test-key', 5, 1000);
    expect(customStore.size).toBe(1);

    // Should not sweep recently created bucket
    const swept1 = customStore.sweepStale(5000);
    expect(swept1).toBe(0);
    expect(customStore.size).toBe(1);

    // Sweeping with negative/zero max age should sweep it
    const swept2 = customStore.sweepStale(-1);
    expect(swept2).toBe(1);
    expect(customStore.size).toBe(0);
  });
});
