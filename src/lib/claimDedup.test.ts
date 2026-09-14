import { describe, it, expect } from 'vitest';
import { deduplicateClaims } from './claimDedup';

describe('deduplicateClaims', () => {
  it('keeps distinct, substantive claims', () => {
    const claims = [
      'The president signed the bill into law on Tuesday.',
      'The unemployment rate fell to 3.9% in March.',
    ];
    expect(deduplicateClaims(claims)).toHaveLength(2);
  });

  it('drops near-duplicate claims with high token overlap', () => {
    const claims = [
      'The president signed the infrastructure bill into law on Tuesday afternoon.',
      'The president signed the infrastructure bill into law Tuesday.',
    ];
    expect(deduplicateClaims(claims)).toHaveLength(1);
  });

  it('drops exact case-insensitive duplicates', () => {
    const claims = [
      'The company reported record profits this quarter.',
      'the company reported record profits this quarter.',
    ];
    expect(deduplicateClaims(claims)).toHaveLength(1);
  });

  it('discards claims that are too short to be substantive', () => {
    const claims = ['Too short', 'ok', 'The city council approved the new budget proposal unanimously.'];
    expect(deduplicateClaims(claims)).toEqual(['The city council approved the new budget proposal unanimously.']);
  });

  it('returns an empty array for empty input', () => {
    expect(deduplicateClaims([])).toEqual([]);
  });
});
