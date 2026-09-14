import { createClient } from '@/lib/supabase/server';

export interface AuthedUser {
  id: string;
  email?: string;
}

/** Resolves the signed-in Supabase user for the current request, or null. */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? undefined };
}
