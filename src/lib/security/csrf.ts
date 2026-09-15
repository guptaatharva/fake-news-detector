// src/lib/security/csrf.ts
//
// Origin-Based CSRF Protection (§M-8):
// Modern browsers automatically attach the `Origin` header to all cross-origin
// requests and state-changing (POST, PUT, DELETE, PATCH) requests. Comparing
// `Origin` against the request `Host` is RFC 6454-compliant CSRF defense for
// Next.js App Router API handlers.

import { NextRequest, NextResponse } from 'next/server';

export interface CsrfValidationResult {
  ok: boolean;
  response?: NextResponse;
}

/**
 * Validates that state-changing requests originate from the application's own host.
 */
export function validateSameOrigin(req: NextRequest): CsrfValidationResult {
  const origin = req.headers.get('origin');

  if (!origin) {
    // If Origin is omitted (e.g. CLI tools or same-origin top-level navigations),
    // check the Fetch Metadata `Sec-Fetch-Site` header supported by all modern browsers.
    const fetchSite = req.headers.get('sec-fetch-site');
    if (fetchSite === 'cross-site') {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Cross-origin request rejected by security policy.' },
          { status: 403 }
        ),
      };
    }
    return { ok: true };
  }

  try {
    const originUrl = new URL(origin);
    const host = req.headers.get('host') || req.nextUrl.host;

    if (originUrl.host.toLowerCase() !== host.toLowerCase()) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Cross-origin request rejected by security policy.' },
          { status: 403 }
        ),
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid Origin header received.' },
        { status: 403 }
      ),
    };
  }
}
