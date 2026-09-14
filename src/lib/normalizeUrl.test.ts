import { describe, it, expect } from 'vitest';
import { normalizeUrlForDedup } from './normalizeUrl';

describe('normalizeUrlForDedup', () => {
  it('treats protocol, www, host case, and trailing slash as equivalent', () => {
    const a = normalizeUrlForDedup('https://www.Example.com/story/1/');
    const b = normalizeUrlForDedup('http://example.com/story/1');
    expect(a).toBe(b);
  });

  it('strips tracking params but keeps meaningful query params', () => {
    const a = normalizeUrlForDedup('https://example.com/story/1?utm_source=twitter&utm_medium=social&id=42');
    const b = normalizeUrlForDedup('https://example.com/story/1?id=42');
    expect(a).toBe(b);
  });

  it('is order-independent for surviving query params', () => {
    const a = normalizeUrlForDedup('https://example.com/s?b=2&a=1');
    const b = normalizeUrlForDedup('https://example.com/s?a=1&b=2');
    expect(a).toBe(b);
  });

  it('treats different meaningful query params as different URLs', () => {
    const a = normalizeUrlForDedup('https://example.com/s?id=1');
    const b = normalizeUrlForDedup('https://example.com/s?id=2');
    expect(a).not.toBe(b);
  });

  it('treats different paths as different URLs', () => {
    const a = normalizeUrlForDedup('https://example.com/story/1');
    const b = normalizeUrlForDedup('https://example.com/story/2');
    expect(a).not.toBe(b);
  });

  it('accepts a bare domain-and-path with no protocol', () => {
    expect(normalizeUrlForDedup('example.com/story/1')).toBe(normalizeUrlForDedup('https://example.com/story/1'));
  });

  it('drops the fragment', () => {
    const a = normalizeUrlForDedup('https://example.com/story#section-2');
    const b = normalizeUrlForDedup('https://example.com/story');
    expect(a).toBe(b);
  });

  it('returns null for invalid input', () => {
    expect(normalizeUrlForDedup('')).toBeNull();
    expect(normalizeUrlForDedup('   ')).toBeNull();
    expect(normalizeUrlForDedup(null)).toBeNull();
    expect(normalizeUrlForDedup(undefined)).toBeNull();
    expect(normalizeUrlForDedup('not a url at all')).toBeNull();
  });

  it('rejects non-http(s) protocols', () => {
    expect(normalizeUrlForDedup('ftp://example.com/file')).toBeNull();
    expect(normalizeUrlForDedup('javascript:alert(1)')).toBeNull();
  });
});
