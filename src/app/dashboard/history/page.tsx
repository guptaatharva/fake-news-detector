import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, Link as LinkIcon, FileText, Calendar } from "lucide-react";
import Link from "next/link";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default async function HistoryPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect("/api/auth/signin");
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { claims: true },
  });

  const getVerdictTheme = (verdict: string) => {
    switch (verdict) {
      case "TRUE":
      case "MOSTLY_TRUE":
        return {
          label: "VERIFIED",
          badge: "bg-verificator-verified/15 text-verificator-verified border-verificator-verified/30",
          icon: ShieldCheck,
        };
      case "FALSE":
      case "MOSTLY_FALSE":
        return {
          label: "FALSE",
          badge: "bg-neonRed/15 text-neonRed border-neonRed/30",
          icon: ShieldAlert,
        };
      case "MIXTURE":
        return {
          label: "PARTIAL",
          badge: "bg-verificator-warning/15 text-verificator-warning border-verificator-warning/30",
          icon: AlertTriangle,
        };
      default:
        return {
          label: "UNVERIFIED",
          badge: "bg-graphite-elevated text-muted-foreground border-graphite-border",
          icon: HelpCircle,
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-graphite-border pb-6">
        <div className="space-y-1">
          <div className="font-mono text-xs text-neonRed font-bold uppercase tracking-widest">
            INTELLIGENCE REPOSITORY ARCHIVE
          </div>
          <h1 className="font-display text-4xl font-extrabold text-foreground">
            Verification <span className="text-neonRed">Archive</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Review all past fact-checking reports, evidence matrices, and confidence records.
          </p>
        </div>

        <div className="font-mono text-xs text-muted-foreground bg-graphite-surface px-4 py-2 rounded-2xl border border-graphite-border">
          TOTAL RECORDS: <strong className="text-neonRed-bright font-bold">{analyses.length}</strong>
        </div>
      </div>

      {/* Empty State */}
      {analyses.length === 0 ? (
        <div className="surface-card p-12 text-center space-y-4 border border-dashed border-graphite-border bg-graphite-surface">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-graphite-elevated border border-graphite-border mx-auto">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">
            Your intelligence archive is empty.
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No verification analyses recorded yet under your session.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 font-mono text-xs text-neonRed hover:underline"
            >
              <span>GO TO VERIFICATION WORKSPACE →</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Timeline Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((analysis) => {
            const theme = getVerdictTheme(analysis.verdict);
            const Icon = theme.icon;

            return (
              <div
                key={analysis.id}
                className="surface-card p-6 flex flex-col justify-between space-y-5 surface-card-hover border border-graphite-border bg-graphite-surface"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono font-bold ${theme.badge}`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{theme.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div>
                    {analysis.sourceUrl ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground truncate">
                        <LinkIcon className="h-4 w-4 text-neonRed shrink-0" />
                        <span className="truncate">{analysis.sourceUrl}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground truncate">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span>Text Passage Verification</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-graphite-border flex items-center justify-between font-mono text-xs text-muted-foreground">
                  <span>{analysis.claims.length} CLAIMS ANALYZED</span>
                  <span className="text-neonRed font-bold">
                    {analysis.confidence}% CONFIDENCE
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
