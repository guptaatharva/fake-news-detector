import { describe, it, expect } from 'vitest';
import { SearchService } from './search.service';

describe('SearchService.sanitizeQuery', () => {
  it('strips site: operators and boolean keywords', () => {
    const result = SearchService.sanitizeQuery('site:reuters.com election fraud AND voting');
    expect(result).not.toMatch(/site:/i);
    expect(result).not.toMatch(/\bAND\b/);
  });

  it('removes quotes and punctuation that break provider syntax', () => {
    const result = SearchService.sanitizeQuery(`"The president said" it's true!`);
    expect(result).not.toMatch(/['"]/);
  });

  it('shortens overly long queries to key terms', () => {
    const longClaim =
      'The government announced today that it will be implementing a brand new comprehensive policy framework regarding renewable energy infrastructure investment nationwide';
    const result = SearchService.sanitizeQuery(longClaim);
    expect(result.split(/\s+/).length).toBeLessThanOrEqual(8);
  });

  it('returns an empty string for empty input', () => {
    expect(SearchService.sanitizeQuery('')).toBe('');
  });
});
