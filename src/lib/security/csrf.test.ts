import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { validateSameOrigin } from './csrf';

describe('validateSameOrigin', () => {
  it('allows requests matching host and origin', () => {
    const req = new NextRequest('https://veracius.app/api/save-analysis', {
      method: 'POST',
      headers: {
        host: 'veracius.app',
        origin: 'https://veracius.app',
      },
    });
    const result = validateSameOrigin(req);
    expect(result.ok).toBe(true);
  });

  it('rejects cross-origin requests from an attacker origin', () => {
    const req = new NextRequest('https://veracius.app/api/save-analysis', {
      method: 'POST',
      headers: {
        host: 'veracius.app',
        origin: 'https://evil-attacker.com',
      },
    });
    const result = validateSameOrigin(req);
    expect(result.ok).toBe(false);
    expect(result.response?.status).toBe(403);
  });

  it('rejects cross-site fetch without origin header if Sec-Fetch-Site is cross-site', () => {
    const req = new NextRequest('https://veracius.app/api/save-analysis', {
      method: 'POST',
      headers: {
        host: 'veracius.app',
        'sec-fetch-site': 'cross-site',
      },
    });
    const result = validateSameOrigin(req);
    expect(result.ok).toBe(false);
    expect(result.response?.status).toBe(403);
  });

  it('allows requests without origin when Sec-Fetch-Site is same-origin', () => {
    const req = new NextRequest('https://veracius.app/api/save-analysis', {
      method: 'POST',
      headers: {
        host: 'veracius.app',
        'sec-fetch-site': 'same-origin',
      },
    });
    const result = validateSameOrigin(req);
    expect(result.ok).toBe(true);
  });
});
