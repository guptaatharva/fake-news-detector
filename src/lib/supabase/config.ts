export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

/**
 * The anonymous key is intentionally browser-safe. Server-only privileges must
 * never be added here; this application does not use a service-role key.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase now labels newly generated browser-safe keys as "publishable".
  // Continue accepting the older anon-key name so either dashboard export works.
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}
