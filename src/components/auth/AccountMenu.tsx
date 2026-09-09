"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

function getUsername(user: NonNullable<ReturnType<typeof useAuth>["user"]>) {
  const metadata = user.user_metadata ?? {};
  const username = metadata.username ?? metadata.full_name ?? metadata.name;

  return typeof username === "string" && username.trim()
    ? username.trim()
    : user.email?.split("@")[0] ?? "Account";
}

export default function AccountMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const username = getUsername(user);

  return (
    <details className="group relative hidden sm:block">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-graphite-border px-4 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-neonRed/50 hover:text-accent [&::-webkit-details-marker]:hidden">
        <UserRound className="h-3.5 w-3.5 text-neonRed" />
        <span className="max-w-28 truncate" title={username}>{username}</span>
      </summary>
      <div className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-graphite-border-sec bg-graphite-surface p-1.5 shadow-2xl backdrop-blur-xl">
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-neonRed/10 hover:text-accent"
        >
          <UserRound className="h-3.5 w-3.5 text-neonRed" />
          Profile
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-neonRed/10 hover:text-accent"
        >
          <LogOut className="h-3.5 w-3.5 text-neonRed" />
          Log out
        </button>
      </div>
    </details>
  );
}
