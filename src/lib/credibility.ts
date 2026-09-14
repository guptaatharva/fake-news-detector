// src/lib/credibility.ts

import { isSatireDomain } from './satire';

// Formula: Credibility = Domain Authority + Historical Accuracy + Expertise Score + Citation Quality + Freshness Score - Bias Penalty

export interface CredibilityFactors {
  domainAuthority: number; // 0-30
  authorAvailability: number; // 0-20
  citationQuality: number; // 0-20
  historicalReliability: number; // 0-20
  freshness: number; // 0-10
}

export function calculateCredibilityScore(factors: CredibilityFactors): number {
  const score =
    factors.domainAuthority +
    factors.authorAvailability +
    factors.citationQuality +
    factors.historicalReliability +
    factors.freshness;

  return Math.max(0, Math.min(100, score));
}

const KNOWN_DOMAINS: Record<string, CredibilityFactors> = {
  'reuters.com': { domainAuthority: 29, authorAvailability: 18, citationQuality: 19, historicalReliability: 19, freshness: 8 },
  'apnews.com': { domainAuthority: 29, authorAvailability: 18, citationQuality: 19, historicalReliability: 19, freshness: 8 },
  'bbc.com': { domainAuthority: 28, authorAvailability: 17, citationQuality: 18, historicalReliability: 18, freshness: 8 },
  'bbc.co.uk': { domainAuthority: 28, authorAvailability: 17, citationQuality: 18, historicalReliability: 18, freshness: 8 },
  'npr.org': { domainAuthority: 27, authorAvailability: 17, citationQuality: 18, historicalReliability: 18, freshness: 8 },
  'nature.com': { domainAuthority: 29, authorAvailability: 18, citationQuality: 20, historicalReliability: 19, freshness: 6 },
  'science.org': { domainAuthority: 29, authorAvailability: 18, citationQuality: 20, historicalReliability: 19, freshness: 6 },
  'thelancet.com': { domainAuthority: 28, authorAvailability: 18, citationQuality: 20, historicalReliability: 19, freshness: 6 },
  'who.int': { domainAuthority: 29, authorAvailability: 15, citationQuality: 18, historicalReliability: 19, freshness: 8 },
  'cdc.gov': { domainAuthority: 29, authorAvailability: 15, citationQuality: 18, historicalReliability: 19, freshness: 8 },
  'gov.uk': { domainAuthority: 28, authorAvailability: 14, citationQuality: 17, historicalReliability: 18, freshness: 7 },
  'theguardian.com': { domainAuthority: 26, authorAvailability: 17, citationQuality: 17, historicalReliability: 16, freshness: 8 },
  'ft.com': { domainAuthority: 26, authorAvailability: 17, citationQuality: 17, historicalReliability: 17, freshness: 8 },
  'bloomberg.com': { domainAuthority: 25, authorAvailability: 16, citationQuality: 16, historicalReliability: 16, freshness: 8 },
  'nytimes.com': { domainAuthority: 27, authorAvailability: 17, citationQuality: 17, historicalReliability: 16, freshness: 8 },
  'washingtonpost.com': { domainAuthority: 26, authorAvailability: 17, citationQuality: 17, historicalReliability: 16, freshness: 8 },
  'wsj.com': { domainAuthority: 26, authorAvailability: 17, citationQuality: 17, historicalReliability: 16, freshness: 8 },
  'x.com': { domainAuthority: 20, authorAvailability: 10, citationQuality: 5, historicalReliability: 10, freshness: 10 },
  'twitter.com': { domainAuthority: 20, authorAvailability: 10, citationQuality: 5, historicalReliability: 10, freshness: 10 },
  'facebook.com': { domainAuthority: 18, authorAvailability: 8, citationQuality: 4, historicalReliability: 8, freshness: 10 },
  'reddit.com': { domainAuthority: 17, authorAvailability: 6, citationQuality: 4, historicalReliability: 8, freshness: 10 },
  'medium.com': { domainAuthority: 15, authorAvailability: 10, citationQuality: 8, historicalReliability: 9, freshness: 7 },
  'wikipedia.org': { domainAuthority: 22, authorAvailability: 8, citationQuality: 16, historicalReliability: 14, freshness: 8 },
};

const DEFAULT_FACTORS: CredibilityFactors = {
  domainAuthority: 15,
  authorAvailability: 10,
  citationQuality: 10,
  historicalReliability: 10,
  freshness: 5,
};

export function getDomainBaseFactors(domain: string): CredibilityFactors {
  const normalizedDomain = (domain || '').toLowerCase().replace(/^www\./, '');

  if (KNOWN_DOMAINS[normalizedDomain]) {
    return KNOWN_DOMAINS[normalizedDomain];
  }

  // Default for unknown sources
  return DEFAULT_FACTORS;
}

export function getCredibilityCategory(score: number): string {
  if (score >= 90) return 'OFFICIAL';
  if (score >= 75) return 'ESTABLISHED_MEDIA';
  if (score >= 50) return 'INDEPENDENT_BLOGS';
  return 'UNKNOWN';
}

/** Maps a 0-100 credibility score to the coarse HIGH/MEDIUM/LOW label used in the UI. */
export function scoreToCredibilityLabel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 70) return 'HIGH';
  if (score >= 45) return 'MEDIUM';
  return 'LOW';
}

export interface DomainAuthorityInput {
  domain: string;
  hasAuthor?: boolean;
  publishedAt?: string | null;
}

export interface DomainCredibilityResult {
  domain: string;
  score: number;
  label: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  isSatire: boolean;
}

/**
 * Ground per-source credibility in the deterministic domain-authority model
 * instead of letting the LLM assign an unsupported "HIGH"/"MEDIUM"/"LOW" label.
 * Author-byline presence and publish recency are folded in as small, honest
 * adjustments on top of the static domain-authority baseline.
 */
export function evaluateDomainCredibility(input: DomainAuthorityInput): DomainCredibilityResult {
  const normalizedDomain = (input.domain || '').toLowerCase().replace(/^www\./, '');
  const base = { ...getDomainBaseFactors(normalizedDomain) };

  // Byline/author transparency signal (§3.10): a known author nudges
  // authorAvailability up a little for otherwise-unscored domains.
  if (input.hasAuthor && !KNOWN_DOMAINS[normalizedDomain]) {
    base.authorAvailability = Math.min(20, base.authorAvailability + 4);
  }

  // Freshness signal from the actual publish date, when available.
  if (input.publishedAt) {
    const parsed = new Date(input.publishedAt);
    if (!isNaN(parsed.getTime())) {
      const ageDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
      base.freshness = ageDays <= 30 ? Math.min(10, base.freshness + 2) : ageDays > 730 ? Math.max(0, base.freshness - 3) : base.freshness;
    }
  }

  const score = calculateCredibilityScore(base);
  const satire = isSatireDomain(normalizedDomain);

  return {
    domain: normalizedDomain,
    score,
    label: scoreToCredibilityLabel(score),
    category: getCredibilityCategory(score),
    isSatire: satire,
  };
}
