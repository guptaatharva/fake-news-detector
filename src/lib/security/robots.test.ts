import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isScrapingAllowed } from './robots';

function mockRobotsResponse(body: string | null, ok = true) {
  return vi.fn().mockResolvedValue({
    ok: ok && body !== null,
    text: async () => body ?? '',
  });
}

describe('isScrapingAllowed', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Each test uses a distinct origin — robots.txt rules are cached per-origin
  // for the process lifetime, so reusing an origin across tests would read a
  // previous test's cached result instead of exercising the mock.

  it('allows scraping when robots.txt disallows nothing for our agent', async () => {
    global.fetch = mockRobotsResponse('User-agent: *\nAllow: /\n') as any;
    expect(await isScrapingAllowed('https://allow-all.example.com/article/1')).toBe(true);
  });

  it('disallows scraping a path blocked for the wildcard user-agent', async () => {
    global.fetch = mockRobotsResponse('User-agent: *\nDisallow: /private/\n') as any;
    expect(await isScrapingAllowed('https://disallow-path.example.com/private/secret')).toBe(false);
  });

  it('respects a more specific Allow rule overriding a shorter Disallow', async () => {
    global.fetch = mockRobotsResponse('User-agent: *\nDisallow: /\nAllow: /public/\n') as any;
    expect(await isScrapingAllowed('https://mixed-rules.example.com/public/article')).toBe(true);
    expect(await isScrapingAllowed('https://mixed-rules.example.com/other/article')).toBe(false);
  });

  it('treats an unreachable robots.txt as unrestricted', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error')) as any;
    expect(await isScrapingAllowed('https://unreachable.example.com/article/1')).toBe(true);
  });

  it('treats a missing (404) robots.txt as unrestricted', async () => {
    global.fetch = mockRobotsResponse(null, false) as any;
    expect(await isScrapingAllowed('https://missing-robots.example.com/article/1')).toBe(true);
  });
});
