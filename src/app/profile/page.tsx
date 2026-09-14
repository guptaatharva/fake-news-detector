import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Mail, ShieldCheck, UserRound, BarChart3, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DeleteAccountButton from "@/components/auth/DeleteAccountButton";
import { computeUserStats, type UserStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login?next=/profile");
  }

  let dbUsername: string | null = null;
  if (supabase) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.username) {
        dbUsername = profile.username;
      }
    } catch {
      // fallback to user_metadata
    }
  }

  const username =
    dbUsername ??
    user.user_metadata?.username ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "Not available";

  let stats: UserStats | null = null;
  try {
    stats = await computeUserStats(user.id);
  } catch (error: any) {
    console.error("[Profile Page] Could not load user stats:", error?.message || error);
  }

  const verdictEntries = stats ? Object.entries(stats.verdictCounts).sort((a, b) => b[1] - a[1]) : [];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pb-16 pt-32 lg:px-8">
      <section className="surface-card space-y-8 border border-graphite-border bg-graphite-surface p-6 shadow-2xl sm:p-10">
        <div className="flex flex-col justify-between gap-5 border-b border-graphite-border pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-neonRed">Secure account terminal</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold text-foreground">Profile <span className="text-neonRed">Access</span></h1>
            <p className="mt-2 text-sm text-muted-foreground">Your VeraCius account is authenticated through Supabase.</p>
          </div>
          <Link href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border border-neonRed/40 px-4 font-mono text-xs font-bold uppercase tracking-wider text-neonRed transition-colors hover:bg-neonRed/10">Open workspace</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5"><Mail className="mb-3 h-5 w-5 text-neonRed" /><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email</p><p className="mt-1 break-all text-sm font-semibold text-foreground">{user.email ?? "Not available"}</p></div>
          <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5"><UserRound className="mb-3 h-5 w-5 text-neonRed" /><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Username</p><p className="mt-1 break-all text-sm font-semibold text-foreground">{username}</p></div>
          <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5"><BadgeCheck className="mb-3 h-5 w-5 text-verificator-verified" /><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email status</p><p className="mt-1 text-sm font-semibold text-foreground">{user.email_confirmed_at ? "Verified" : "Awaiting confirmation"}</p></div>
          <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5"><ShieldCheck className="mb-3 h-5 w-5 text-verificator-verified" /><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Session state</p><p className="mt-1 text-sm font-semibold text-foreground">Active and protected</p></div>
        </div>
        {stats && (
          <section className="border-t border-graphite-border pt-6 space-y-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-neonRed" />
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-neonRed">Your verification activity</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Total analyses</p>
                <p className="mt-1 font-display text-3xl font-black text-foreground">{stats.totalAnalyses}</p>
              </div>

              <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Verdict distribution</p>
                {verdictEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No analyses yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {verdictEntries.map(([verdict, count]) => (
                      <div key={verdict} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">{verdict.replace(/_/g, " ")}</span>
                        <span className="text-foreground font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {stats.topDomains.length > 0 && (
              <div className="rounded-2xl border border-graphite-border bg-graphite-bg/70 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-3.5 w-3.5 text-neonRed" />
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Most-checked domains</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.topDomains.map((d) => (
                    <span
                      key={d.domain}
                      className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-graphite-surface border border-graphite-border text-muted-foreground"
                    >
                      {d.domain} <span className="text-neonRed font-bold">{d.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="border-t border-graphite-border pt-6">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-neonRed">Danger zone</p>
          <p className="mt-2 text-sm text-muted-foreground">Delete your VeraCius account and all saved account data.</p>
          <div className="mt-4"><DeleteAccountButton /></div>
        </section>
      </section>
    </main>
  );
}
