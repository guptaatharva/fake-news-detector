"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | null | undefined;

/** Returns one shared browser client, or null until Supabase is configured. */
export function createClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  // During server-side rendering of client components, return a fresh client
  if (typeof window === "undefined") {
    return createBrowserClient(config.url, config.anonKey);
  }

  // In the browser, maintain a single client instance
  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.anonKey);
  }

  return browserClient;
}

