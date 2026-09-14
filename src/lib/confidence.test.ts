import { describe, it, expect } from 'vitest';
import { calculateDeterministicConfidence, computeRecencyScore, aggregateVerdict } from './confidence';

describe('calculateDeterministicConfidence', () => {
  it('weights the four factors as documented (35/25/25/15)', () => {
    const result = calculateDeterministicConfidence({
      averageSourceReliability: 100,
      evidenceStrengthRatio: 1,
      multiAgentAgreement: 1,
      recencyScore: 100,
    });
    expect(result.totalConfidence).toBe(100);
    expect(result.sourceQuality).toBe(35);
    expect(result.evidenceStrength).toBe(25);
    expect(result.agentAgreement).toBe(25);
    expect(result.freshness).toBe(15);
  });

  it('returns 0 for all-zero factors', () => {
    const result = calculateDeterministicConfidence({
      averageSourceReliability: 0,
      evidenceStrengthRatio: 0,
      multiAgentAgreement: 0,
      recencyScore: 0,
    });
    expect(result.totalConfidence).toBe(0);
  });

  it('clamps out-of-range inputs instead of producing a nonsensical score', () => {
    const result = calculateDeterministicConfidence({
      averageSourceReliability: 500,
      evidenceStrengthRatio: 5,
      multiAgentAgreement: -3,
      recencyScore: -50,
    });
    expect(result.totalConfidence).toBe(60); // sourceQuality(35) + evidenceStrength(25) only
  });
});

describe('computeRecencyScore', () => {
  it('gives undated evidence a neutral score, not a penalty', () => {
    expect(computeRecencyScore(undefined)).toBe(50);
    expect(computeRecencyScore(null)).toBe(50);
  });

  it('scores very recent evidence highest', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(computeRecencyScore(yesterday)).toBe(100);
  });

  it('scores multi-year-old evidence lowest', () => {
    const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeRecencyScore(fiveYearsAgo)).toBe(25);
  });
});

describe('aggregateVerdict', () => {
  it('returns UNVERIFIABLE when no claim has a verifiable verdict', () => {
    const result = aggregateVerdict([{ verdict: 'UNVERIFIABLE', confidence: 50 }]);
    expect(result.verdict).toBe('UNVERIFIABLE');
    expect(result.verifiableCount).toBe(0);
  });

  it('weights claims by their own confidence', () => {
    const result = aggregateVerdict([
      { verdict: 'TRUE', confidence: 90 },
      { verdict: 'FALSE', confidence: 10 },
    ]);
    expect(result.verdict).toBe('TRUE');
  });

  it('averages evenly-weighted mixed verdicts into MIXTURE', () => {
    const result = aggregateVerdict([
      { verdict: 'TRUE', confidence: 50 },
      { verdict: 'FALSE', confidence: 50 },
    ]);
    expect(result.verdict).toBe('MIXTURE');
  });
});
