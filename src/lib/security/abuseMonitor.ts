// src/lib/security/abuseMonitor.ts
//
// §9.4: basic abuse monitoring for adversarial/wasteful submissions — the rate
// limiter already caps *volume*, this catches the specific pattern of the same
// identity resubmitting the exact same content repeatedly in a short window
// (e.g. a script hammering one URL to burn API quota, or probing for a
// different verdict by retrying). It only logs; nothing here blocks a
// request — pair with real log aggregation/alerting in production.

const WINDOW_MS = 10 * 60 * 1000;
const REPEAT_WARN_THRESHOLD = 3;

interface Entry {
  count: number;
  firstSeenAt: number;
}

const recentSubmissions = new Map<string, Entry>();

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalize(content: string): string {
  return content.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 2000);
}

export interface AbuseCheckResult {
  isAbusive: boolean;
  occurrences: number;
}

/**
 * Records a submission and reports whether this identity has now repeated
 * the same normalized content at least REPEAT_WARN_THRESHOLD times within
 * the monitoring window. Pure/synchronous and in-memory so it's cheap to
 * call on every request and easy to unit test — the caller decides whether
 * to log/persist/surface an abusive result (see `logAbuseEvent` below).
 */
export function recordSubmissionAndCheckAbuse(identity: string, content: string): AbuseCheckResult {
  const key = `${identity}:${simpleHash(normalize(content))}`;
  const now = Date.now();
  const existing = recentSubmissions.get(key);

  if (!existing || now - existing.firstSeenAt > WINDOW_MS) {
    recentSubmissions.set(key, { count: 1, firstSeenAt: now });
    return { isAbusive: false, occurrences: 1 };
  }

  existing.count += 1;
  const isAbusive = existing.count >= REPEAT_WARN_THRESHOLD;
  return { isAbusive, occurrences: existing.count };
}

/**
 * Persists an abuse event to the database (best-effort, never throws) so
 * there's a queryable history reviewable at /admin/abuse instead of only
 * ephemeral console logs (§9.4). Also always logs, since the DB write can fail
 * independently (e.g. this repo's own dev DATABASE_URL is currently
 * unreachable) and the console log must not depend on it succeeding.
 */
export async function logAbuseEvent(
  identity: string,
  scope: string,
  reason: string,
  occurrences: number,
): Promise<void> {
  console.warn(`[AbuseMonitor] ${reason} — identity=${identity} scope=${scope} occurrences=${occurrences}`);
  try {
    const { prisma } = await import('../prisma');
    await prisma.abuseEvent.create({ data: { identity, scope, reason, occurrences } });
  } catch (err: any) {
    console.warn(`[AbuseMonitor] Could not persist abuse event (non-fatal): ${err?.message || err}`);
  }
}
