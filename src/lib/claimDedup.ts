// src/lib/claimDedup.ts
//
// Extracted from the extract API route so it can be unit-tested (§7.1)
// without violating Next.js's constraint that a route.ts file may only
// export HTTP method handlers and route config.

export function deduplicateClaims(rawClaims: string[]): string[] {
  const deduped: string[] = [];
  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'to', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
    'just', 'should', 'now', 'that', 'this', 'these', 'those', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while'
  ]);

  const getSignificantTokens = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );
  };

  for (const raw of rawClaims) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length < 15) continue;

    const tokens = getSignificantTokens(trimmed);
    if (tokens.size < 3) continue;

    let isDuplicate = false;
    for (const existing of deduped) {
      if (existing.toLowerCase() === trimmed.toLowerCase()) {
        isDuplicate = true;
        break;
      }

      const existingTokens = getSignificantTokens(existing);
      let intersection = 0;
      for (const t of tokens) {
        if (existingTokens.has(t)) intersection++;
      }
      const union = new Set([...tokens, ...existingTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;

      const minTokens = Math.min(tokens.size, existingTokens.size);
      const overlap = minTokens > 0 ? intersection / minTokens : 0;

      if (jaccard > 0.65 || overlap > 0.85) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      deduped.push(trimmed);
    }
  }

  return deduped;
}
