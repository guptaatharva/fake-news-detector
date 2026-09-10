"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, ShieldQuestion, XOctagon, Download, Loader2, AlertCircle } from "lucide-react";
import { useAnalysis } from "@/context/AnalysisContext";
import { generateAnalysisPdf } from "@/lib/pdf/generateAnalysisPdf";

interface IntelligenceReportProps {
  verdict: "VERIFIED" | "PARTIALLY VERIFIED" | "MISLEADING" | "UNVERIFIED" | "FALSE";
  confidenceScore: number;
  summary: string;
  keyFindings: string[];
}

export default function IntelligenceReport({ verdict, confidenceScore, summary, keyFindings }: IntelligenceReportProps) {
  const { result, url, text } = useAnalysis();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleSavePdf = async () => {
    if (isGeneratingPdf) return;
    if (!result) {
      setPdfError("No active analysis to export.");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      // Small timeout to allow UI loading state to render smoothly
      await new Promise((resolve) => setTimeout(resolve, 80));
      generateAnalysisPdf({
        result,
        inputUrl: url || undefined,
        inputText: text || undefined,
      });
    } catch (err: any) {
      console.error("[Export PDF] Error generating PDF:", err);
      setPdfError(err?.message || "Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const cleanSummary = (summary || "").trim();
    const shortSummary = cleanSummary.length > 350
      ? `${cleanSummary.substring(0, 347)}...`
      : cleanSummary;

    const shareMessage = `VeraCius AI Analysis\n\nVerdict: ${verdict}\nConfidence: ${confidenceScore}%\n\n${shortSummary}\n\nAnalyzed with VeraCius AI.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const getVerdictConfig = (v: string) => {
    switch (v) {
      case "VERIFIED":
        return { color: "text-verificator-verified", bg: "bg-verificator-verified/10", border: "border-verificator-verified/50", icon: ShieldCheck };
      case "PARTIALLY VERIFIED":
        return { color: "text-verificator-mostlyTrue", bg: "bg-verificator-mostlyTrue/10", border: "border-verificator-mostlyTrue/50", icon: ShieldAlert };
      case "MISLEADING":
        return { color: "text-verificator-mixture", bg: "bg-verificator-mixture/10", border: "border-verificator-mixture/50", icon: AlertTriangle };
      case "UNVERIFIED":
        return { color: "text-verificator-unverifiable", bg: "bg-verificator-unverifiable/10", border: "border-verificator-unverifiable/50", icon: ShieldQuestion };
      case "FALSE":
        return { color: "text-verificator-false", bg: "bg-verificator-false/10", border: "border-verificator-false/50", icon: XOctagon };
      default:
        return { color: "text-muted-foreground", bg: "bg-[#241014]", border: "border-graphite-border-sec", icon: ShieldQuestion };
    }
  };

  const config = getVerdictConfig(verdict);
  const Icon = config.icon;

  return (
    <div className="w-full bg-graphite-bg border border-graphite-border rounded-2xl overflow-hidden relative">
      {/* Header */}
      <div className={`p-6 border-b border-graphite-border flex flex-col md:flex-row md:items-center justify-between gap-6 relative`}>
        {/* Subtle background glow based on verdict */}
        <div className={`absolute inset-0 ${config.bg} opacity-20 pointer-events-none`} />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className={`w-14 h-14 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center`}>
            <Icon className={`w-7 h-7 ${config.color}`} />
          </div>
          <div>
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">
              INTELLIGENCE ASSESSMENT
            </h2>
            <h3 className={`font-display text-3xl font-black tracking-wide ${config.color}`}>
              {verdict}
            </h3>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-end">
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1 uppercase">
            CONFIDENCE METRIC
          </span>
          <div className={`font-mono text-4xl font-bold ${config.color}`}>
            {confidenceScore}%
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h4 className="font-mono text-xs text-neonRed uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neonRed" />
            EXECUTIVE SUMMARY
          </h4>
          <p className="text-foreground leading-relaxed text-sm">
            {summary}
          </p>
        </div>

        <div>
          <h4 className="font-mono text-xs text-neonRed uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neonRed" />
            KEY FINDINGS
          </h4>
          <div className="space-y-3">
            {keyFindings.map((finding, idx) => (
              <div key={idx} className="flex gap-3 items-start p-4 rounded-xl bg-graphite-surface border border-graphite-border">
                <span className="font-mono text-xs text-muted-foreground mt-0.5">{(idx + 1).toString().padStart(2, '0')}</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions: Save as PDF only */}
      <div className="p-4 border-t border-graphite-border bg-graphite-surface flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-neonRed animate-pulse" />
          REPORT GENERATED BY VERACIUS AI
        </div>

        <div className="flex items-center gap-3">
          {pdfError && (
            <span className="text-[11px] font-mono text-neonRed flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {pdfError}
            </span>
          )}

          <button
            type="button"
            onClick={handleSavePdf}
            disabled={isGeneratingPdf}
            className="h-10 px-4 rounded-xl bg-graphite-bg border border-graphite-border text-xs font-mono tracking-wider font-semibold text-foreground hover:text-neonRed hover:border-neonRed/50 hover:bg-graphite-elevated transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Download complete intelligence verification report as PDF"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 text-neonRed animate-spin" />
                <span>GENERATING PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-neonRed" />
                <span>SAVE PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="h-10 px-4 rounded-xl bg-graphite-bg border border-graphite-border text-xs font-mono tracking-wider font-semibold text-foreground hover:text-[#25D366] hover:border-[#25D366]/50 hover:bg-graphite-elevated transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            title="Share verified intelligence report summary via WhatsApp"
          >
            <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
            <span>SHARE ON WHATSAPP</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}
