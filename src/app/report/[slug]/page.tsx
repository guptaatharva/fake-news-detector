import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/ui/Footer";
import { ShieldCheck, ShieldAlert, XOctagon, ShieldQuestion, Drama, Sparkles, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof ShieldCheck }> = {
  TRUE: { label: "VERIFIED", color: "text-verificator-verified", bg: "bg-verificator-verified/10", border: "border-verificator-verified/50", icon: ShieldCheck },
  MOSTLY_TRUE: { label: "PARTIALLY VERIFIED", color: "text-verificator-mostlyTrue", bg: "bg-verificator-mostlyTrue/10", border: "border-verificator-mostlyTrue/50", icon: ShieldAlert },
  MIXTURE: { label: "MISLEADING", color: "text-verificator-mixture", bg: "bg-verificator-mixture/10", border: "border-verificator-mixture/50", icon: ShieldAlert },
  UNVERIFIABLE: { label: "UNVERIFIED", color: "text-verificator-unverifiable", bg: "bg-verificator-unverifiable/10", border: "border-verificator-unverifiable/50", icon: ShieldQuestion },
  MOSTLY_FALSE: { label: "FALSE", color: "text-verificator-false", bg: "bg-verificator-false/10", border: "border-verificator-false/50", icon: XOctagon },
  FALSE: { label: "FALSE", color: "text-verificator-false", bg: "bg-verificator-false/10", border: "border-verificator-false/50", icon: XOctagon },
  SATIRE: { label: "SATIRE", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/50", icon: Drama },
};

export default async function PublicReportPage({ params }: PageProps) {
  const { slug } = await params;

  const analysis = await prisma.analysis.findFirst({
    where: { publicSlug: slug, isPublic: true },
    include: { claims: { include: { evidence: true } } },
  });

  if (!analysis) notFound();

  const config = VERDICT_CONFIG[analysis.verdict] || VERDICT_CONFIG.UNVERIFIABLE;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-graphite-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-graphite-surface border border-graphite-border">
          <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-neonRed" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            This is a publicly shared, read-only VeraCius AI report. It was generated automatically and can be
            wrong — see our <a href="/methodology" className="text-neonRed hover:underline">methodology &amp; limitations</a>.
          </p>
        </div>

        <div className={`p-6 rounded-2xl border ${config.border} ${config.bg}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <div>
              <h1 className={`font-display text-2xl font-black ${config.color}`}>{config.label}</h1>
              <p className="font-mono text-xs text-muted-foreground">{analysis.confidence}% confidence</p>
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>
          {analysis.sourceUrl && (
            <a
              href={analysis.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-mono text-neonRed hover:underline"
            >
              Original source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-foreground">Claims analyzed ({analysis.claims.length})</h2>
          {analysis.claims.map((claim) => {
            const claimConfig = VERDICT_CONFIG[claim.verdict] || VERDICT_CONFIG.UNVERIFIABLE;
            const ClaimIcon = claimConfig.icon;
            return (
              <div key={claim.id} className={`p-4 rounded-xl border ${claimConfig.border} bg-graphite-surface`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold ${claimConfig.color}`}>
                    <ClaimIcon className="w-3.5 h-3.5" />
                    {claimConfig.label}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-2">&ldquo;{claim.claimText}&rdquo;</p>
                {claim.explanation && <p className="text-xs text-muted-foreground italic">{claim.explanation}</p>}
                {claim.evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-graphite-border/60 flex flex-wrap gap-2">
                    {claim.evidence.map((ev) => (
                      <a
                        key={ev.id}
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono px-2 py-1 rounded-full bg-graphite-bg border border-graphite-border text-muted-foreground hover:text-neonRed hover:border-neonRed/50 transition-colors"
                      >
                        {ev.title || ev.sourceUrl}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
