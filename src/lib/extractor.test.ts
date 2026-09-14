import { describe, it, expect } from 'vitest';
import { __testables } from './extractor';

const { validateContentQuality, cleanText, detectPaywall } = __testables;

describe('validateContentQuality', () => {
  it('accepts real prose with a healthy word-length distribution', () => {
    const article =
      'The city council voted on Tuesday to approve a new infrastructure spending package worth several million dollars, '.repeat(3);
    expect(validateContentQuality(article)).toBe(true);
  });

  it('rejects text shorter than the minimum quality length', () => {
    expect(validateContentQuality('Too short.')).toBe(false);
  });

  it('rejects navigation-menu-like text (mostly very short tokens)', () => {
    const nav = 'Us Uk Eu Tv Ok Go Hi Ok Us Uk Eu Tv Ok Go Hi Ok Us Uk Eu Tv Ok Go Hi Ok Us Uk Eu Tv Ok Go Hi Ok '.repeat(3);
    expect(validateContentQuality(nav)).toBe(false);
  });
});

describe('cleanText', () => {
  it('collapses whitespace and strips common boilerplate phrases', () => {
    const raw = 'Hello   world.\n\nWe use cookies to improve your experience and analyze traffic on our site today.';
    const result = cleanText(raw);
    expect(result).not.toMatch(/we use cookies/i);
    expect(result).not.toMatch(/\s{2,}/);
  });
});

describe('detectPaywall', () => {
  it('flags known paywall banner phrasing', () => {
    expect(detectPaywall('<div>Subscribe now to continue reading this article</div>')).toBe(true);
  });

  it('does not flag ordinary article HTML', () => {
    expect(detectPaywall('<article><p>The mayor announced a new policy today.</p></article>')).toBe(false);
  });
});
