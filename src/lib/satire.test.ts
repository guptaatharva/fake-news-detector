import { describe, it, expect } from 'vitest';
import { isSatireDomain } from './satire';

describe('isSatireDomain', () => {
  it('recognizes known satire outlets', () => {
    expect(isSatireDomain('theonion.com')).toBe(true);
    expect(isSatireDomain('babylonbee.com')).toBe(true);
  });

  it('normalizes a leading www.', () => {
    expect(isSatireDomain('www.theonion.com')).toBe(true);
  });

  it('does not flag a real news outlet', () => {
    expect(isSatireDomain('reuters.com')).toBe(false);
  });

  it('handles missing input safely', () => {
    expect(isSatireDomain(undefined)).toBe(false);
    expect(isSatireDomain('')).toBe(false);
  });
});
