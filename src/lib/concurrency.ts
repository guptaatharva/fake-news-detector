// src/lib/concurrency.ts
//
// Claims used to be processed one at a time in a `for` loop (§5.2), which is
// the main reason a 10-15 claim analysis could take minutes. This runs a
// bounded number of workers concurrently instead of unboundedly parallel
// (which would fan out too many simultaneous scrape/LLM calls at once).

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
