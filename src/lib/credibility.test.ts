import { describe, it, expect } from 'vitest';
import { evaluateDomainCredibility, scoreToCredibilityLabel, calculateCredibilityScore } from './credibility';

describe('evaluateDomainCredibility', () => {
  it('rates a well-known wire service HIGH', () => {
    const result = evaluateDomainCredibility({ domain: 'reuters.com' });
    expect(result.label).toBe('HIGH');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('does not let an unknown domain claim HIGH credibility by default', () => {
    const result = evaluateDomainCredibility({ domain: 'totally-unknown-blog-xyz.example' });
    expect(result.label).not.toBe('HIGH');
  });

  it('flags known satire domains', () => {
    const result = evaluateDomainCredibility({ domain: 'theonion.com' });
    expect(result.isSatire).toBe(true);
  });

  it('normalizes a leading www.', () => {
    const withWww = evaluateDomainCredibility({ domain: 'www.reuters.com' });
    const withoutWww = evaluateDomainCredibility({ domain: 'reuters.com' });
    expect(withWww.domain).toBe(withoutWww.domain);
    expect(withWww.score).toBe(withoutWww.score);
  });
});

describe('scoreToCredibilityLabel', () => {
  it('maps score bands to HIGH/MEDIUM/LOW consistently', () => {
    expect(scoreToCredibilityLabel(90)).toBe('HIGH');
    expect(scoreToCredibilityLabel(60)).toBe('MEDIUM');
    expect(scoreToCredibilityLabel(20)).toBe('LOW');
  });
});

describe('calculateCredibilityScore', () => {
  it('sums factors and clamps to 0-100', () => {
    const score = calculateCredibilityScore({
      domainAuthority: 30,
      authorAvailability: 20,
      citationQuality: 20,
      historicalReliability: 20,
      freshness: 10,
    });
    expect(score).toBe(100);
  });
});
