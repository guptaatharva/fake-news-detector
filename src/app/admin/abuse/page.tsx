import { redirect } from "next/navigation";
import { ShieldAlert, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isAdminUser } from "@/lib/auth/isAdmin";

export const dynamic = "force-dynamic";

// §9.4: minimal review surface for persisted abuse-monitor warnings, gated
// by the ADMIN_EMAILS allowlist. Not a full ops dashboard — no
// filtering/pagination/alerting — but it turns the previously log-only
// signal into something a maintainer can actually go look at.

export default async function AdminAbusePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login?next=/admin/abuse");
  }

  if (!isAdminUser({ id: user.id, email: user.email ?? undefined })) {
    redirect("/dashboard");
  }

  let events: Awaited<ReturnType<typeof prisma.abuseEvent.findMany>> = [];
  let dbError: string | null = null;
  try {
    events = await prisma.abuseEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  } catch (error: any) {
    dbError = "Could not load abuse events from the database at this time.";
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pb-16 pt-32 lg:px-8">
      <div className="mb-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-neonRed">Admin — restricted</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground">
          Abuse <span className="text-neonRed">Monitor</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Identities that resubmitted the exact same content 3+ times within a 10-minute window. Monitoring-only — nothing here was blocked.
        </p>
      </div>

      {dbError ? (
        <div className="rounded-2xl border border-verificator-warning/30 bg-verificator-warning/10 p-6 text-sm text-verificator-warning">
          {dbError}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-graphite-border bg-graphite-surface p-10 text-center text-sm text-muted-foreground">
          No abuse events recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="rounded-2xl border border-graphite-border bg-graphite-surface p-4 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-verificator-warning shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{e.reason}</p>
                <p className="mt-1 text-xs font-mono text-muted-foreground break-all">
                  identity={e.identity} · scope={e.scope} · occurrences={e.occurrences}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
