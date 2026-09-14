// src/lib/security/apiGuard.ts
//
// Shared entry guard for every /api/analyze/* route: all four (plus the new
// debate route) were previously unauthenticated and unrate-limited, so anyone
// with the deployed URL could burn through the NVIDIA/GNews quota directly.
// This combines session-gated access with per-identity rate limiting in one
// call so each route applies it consistently.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '../auth/requireUser';
import { checkRateLimit, getClientIp } from './rateLimit';

export interface GuardOptions {
  /** Logical bucket name for rate limiting, e.g. 'analyze:extract'. */
  scope: string;
  /** Max requests allowed per window for a single identity. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** If true, an unauthenticated caller is rejected outright (401). */
  requireAuth?: boolean;
}

export type GuardOutcome = { ok: true; userId: string | null } | { ok: false; response: NextResponse };

export async function guardApiRequest(req: NextRequest, options: GuardOptions): Promise<GuardOutcome> {
  const user = await getAuthedUser();

  if (options.requireAuth && !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You must be signed in to use this feature.' }, { status: 401 }),
    };
  }

  // Prefer rate-limiting by authenticated user id (harder to evade than IP);
  // fall back to best-effort client IP for anonymous, non-gated routes.
  const identity = user?.id ? `user:${user.id}` : `ip:${getClientIp(req.headers)}`;
  const result = checkRateLimit({ scope: options.scope, identity, limit: options.limit, windowMs: options.windowMs });

  if (!result.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
      ),
    };
  }

  return { ok: true, userId: user?.id || null };
}
