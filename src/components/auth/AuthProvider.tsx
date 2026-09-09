"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<{ error?: string }>;
  deleteAccount: () => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: User | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!initialUser && Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isConfigured: Boolean(supabase),
      signOut: async () => {
        if (!supabase) {
          return { error: "Authentication is not configured yet." };
        }
        const { error } = await supabase.auth.signOut();
        if (!error) {
          setUser(null);
          router.replace("/");
          router.refresh();
        }
        return error ? { error: "Unable to sign out. Please try again." } : {};
      },
      deleteAccount: async () => {
        if (!supabase) {
          return { error: "Authentication is not configured yet." };
        }

        const response = await fetch("/api/account", { method: "DELETE" });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          return { error: result.error ?? "Unable to delete your account. Please try again." };
        }

        await supabase.auth.signOut();
        setUser(null);
        router.replace("/");
        router.refresh();
        return {};
      },
    }),
    [isLoading, router, supabase, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
