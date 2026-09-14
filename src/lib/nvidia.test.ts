import { describe, it, expect } from 'vitest';
import { robustExtractAndParseJson } from './nvidia';

// Locks down the JSON-repair pipeline (§7.1) — this is exactly the kind of
// logic that silently breaks on an edge case (a truncated stream, a stray
// smart-quote from a copy-pasted article) and should be covered by tests.

describe('robustExtractAndParseJson', () => {
  it('parses clean JSON directly', () => {
    const result = robustExtractAndParseJson('{"verdict":"TRUE","confidenceScore":90}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ verdict: 'TRUE', confidenceScore: 90 });
  });

  it('strips markdown code fences', () => {
    const result = robustExtractAndParseJson('```json\n{"a":1}\n```');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 });
  });

  it('strips leading/trailing prose around the JSON object', () => {
    const result = robustExtractAndParseJson('Sure, here is the result:\n{"a":1}\nHope that helps!');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 });
  });

  it('removes trailing commas', () => {
    const result = robustExtractAndParseJson('{"a":1,"b":[1,2,],}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: [1, 2] });
  });

  it('normalizes smart quotes', () => {
    const result = robustExtractAndParseJson('{“a”: “hello”}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 'hello' });
  });

  it('repairs JSON truncated mid-string and mid-structure', () => {
    const truncated = '{"verdict":"TRUE","claims":[{"claimText":"The sky is';
    const result = robustExtractAndParseJson(truncated);
    expect(result.success).toBe(true);
    expect(result.data.verdict).toBe('TRUE');
    expect(Array.isArray(result.data.claims)).toBe(true);
  });

  it('strips <think> reasoning traces before parsing', () => {
    const result = robustExtractAndParseJson('<think>reasoning about the answer</think>{"a":1}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 });
  });

  it('fails gracefully on empty input', () => {
    const result = robustExtractAndParseJson('');
    expect(result.success).toBe(false);
  });

  it('fails gracefully on non-JSON prose with no braces at all', () => {
    const result = robustExtractAndParseJson('I cannot answer that.');
    expect(result.success).toBe(false);
  });
});
