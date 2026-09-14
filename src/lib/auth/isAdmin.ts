import type { AuthedUser } from './requireUser';

/**
 * Simple email-allowlist admin check. This app has no role/permission system
 * (no `role` column, no admin table) — for a single-operator product, a
 * comma-separated `ADMIN_EMAILS` env var is a reasonable, code-feasible
 * substitute rather than building a full RBAC system for one screen.
 */
export function isAdminUser(user: AuthedUser | null): boolean {
  if (!user?.email) return false;
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(user.email.toLowerCase());
}
