import { jsPDF } from "jspdf";
import type { AnalysisResult } from "@/context/AnalysisContext";

interface ExportPdfOptions {
  result: AnalysisResult;
  inputUrl?: string;
  inputText?: string;
}

export function generateAnalysisPdf({ result, inputUrl, inputText }: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = margin;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("VERACIUS AI // INTELLIGENCE VERIFICATION REPORT", margin, y);
    doc.setDrawColor(220, 220, 225);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 8;
  };

  // 1. Top Cover / Header Banner
  doc.setFillColor(15, 15, 18);
  doc.rect(margin, y, contentWidth, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 23, 68);
  doc.text("VERACIUS AI", margin + 6, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 210);
  doc.text("Truth, Verified by Autonomous Intelligence", margin + 6, y + 17);

  const timestamp = result.completedAt || new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 170);
  doc.text(`REPORT GENERATED: ${timestamp}`, pageWidth - margin - 6, y + 11, { align: "right" });
  doc.text("CLASSIFICATION: VERIFIED PUBLIC RECORD", pageWidth - margin - 6, y + 17, { align: "right" });

  y += 32;

  // 2. Analyzed Context / Input Source
  ensureSpace(20);
  doc.setFillColor(245, 246, 248);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "F");
  doc.setDrawColor(225, 228, 232);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 115);
  doc.text("SUBMITTED INPUT CONTEXT", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 35, 45);

  const rawInput = inputUrl
    ? `URL: ${inputUrl}`
    : inputText
    ? `TEXT: "${inputText.slice(0, 140)}${inputText.length > 140 ? "..." : ""}"`
    : "Verified statement passage analysis";

  const splitInput = doc.splitTextToSize(rawInput, contentWidth - 8);
  doc.text(splitInput[0] || "", margin + 4, y + 12);
  y += 24;

  // 3. Overall Verdict & Confidence Matrix
  ensureSpace(34);
  const verdictColors: Record<string, { r: number; g: number; b: number }> = {
    TRUE: { r: 16, g: 149, b: 98 },
    MOSTLY_TRUE: { r: 22, g: 163, b: 74 },
    MIXTURE: { r: 217, g: 119, b: 6 },
    MOSTLY_FALSE: { r: 225, g: 29, b: 72 },
    FALSE: { r: 220, g: 20, b: 60 },
    UNVERIFIABLE: { r: 107, g: 114, b: 128 },
  };

  const vColor = verdictColors[result.verdict] || verdictColors.UNVERIFIABLE;

  // Verdict Box
  doc.setFillColor(vColor.r, vColor.g, vColor.b);
  doc.roundedRect(margin, y, 90, 26, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("OVERALL ASSESSMENT VERDICT", margin + 6, y + 8);

  doc.setFontSize(16);
  doc.text(result.verdict.replace(/_/g, " "), margin + 6, y + 19);

  // Confidence Box
  doc.setFillColor(245, 246, 248);
  doc.roundedRect(margin + 94, y, contentWidth - 94, 26, 2, 2, "F");
  doc.setDrawColor(225, 228, 232);
  doc.roundedRect(margin + 94, y, contentWidth - 94, 26, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 115);
  doc.text("CONFIDENCE RATING", margin + 100, y + 8);

  doc.setFontSize(16);
  doc.setTextColor(vColor.r, vColor.g, vColor.b);
  doc.text(`${result.confidenceScore}%`, margin + 100, y + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 115, 125);
  const totalClaims = result.claims?.length || 0;
  const totalSources = result.sourceDomains?.length || result.extractedSources?.length || 0;
  doc.text(`${totalClaims} Claims | ${totalSources} Independent Sources`, margin + 132, y + 18);

  y += 32;

  // 4. Executive Summary
  ensureSpace(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 23, 68);
  doc.text("EXECUTIVE SYNTHESIS SUMMARY", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(40, 45, 55);
  const summaryLines = doc.splitTextToSize(result.summary || "No summary available.", contentWidth);
  ensureSpace(summaryLines.length * 4.5 + 4);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 4.5 + 4;

  // Score breakdown note if present
  if (result.scoreBreakdown) {
    ensureSpace(12);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110, 115, 125);
    const scoreLines = doc.splitTextToSize(`Metric Breakdown: ${result.scoreBreakdown}`, contentWidth);
    doc.text(scoreLines, margin, y);
    y += scoreLines.length * 4 + 4;
  }

  y += 4;

  // 5. Claim Decomposition & Corroborating Sources
  ensureSpace(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 18);
  doc.text("ISOLATED FACTUAL CLAIMS & CORROBORATING SOURCES", margin, y);
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 8;

  const cleanUrl = (rawUrl?: string): string => {
    if (!rawUrl) return "";
    let u = rawUrl.trim();
    if (u.includes("news.google.com")) return "";
    return u;
  };

  (result.claims || []).forEach((claim, idx) => {
    ensureSpace(35);

    const cColor = verdictColors[claim.verdict] || verdictColors.UNVERIFIABLE;

    // Claim Header bar
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 15, 18);
    doc.text(`CLAIM ${String(idx + 1).padStart(2, "0")}`, margin + 3, y + 5.5);

    doc.setFillColor(cColor.r, cColor.g, cColor.b);
    doc.roundedRect(pageWidth - margin - 38, y + 1.5, 35, 5, 1, 1, "F");

    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(claim.verdict.replace(/_/g, " "), pageWidth - margin - 20.5, y + 5, { align: "center" });

    y += 12;

    // Claim Statement
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(25, 25, 30);
    const claimTextLines = doc.splitTextToSize(`"${claim.claimText}"`, contentWidth - 4);
    ensureSpace(claimTextLines.length * 4.2 + 6);
    doc.text(claimTextLines, margin + 2, y);
    y += claimTextLines.length * 4.2 + 3;

    // Claim Explanation
    if (claim.explanation) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 75, 85);
      const explanationLines = doc.splitTextToSize(claim.explanation, contentWidth - 4);
      ensureSpace(explanationLines.length * 3.8 + 4);
      doc.text(explanationLines, margin + 2, y);
      y += explanationLines.length * 3.8 + 4;
    }

    // Evidence Sources for this claim
    const validEvidence = (claim.evidence || []).filter((e) => {
      const u = cleanUrl(e.sourceUrl || e.url);
      return Boolean(u && u.startsWith("http"));
    });

    if (validEvidence.length > 0) {
      ensureSpace(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 125, 135);
      doc.text("CORROBORATING PUBLISHER SOURCES:", margin + 2, y);
      y += 4;

      validEvidence.forEach((ev) => {
        const directUrl = cleanUrl(ev.sourceUrl || ev.url);
        const pubName = ev.publisher || ev.source || ev.domain || "Primary Publisher";
        const title = ev.title || "Reporting Article";

        ensureSpace(12);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 23, 68);
        doc.text(`• ${pubName}:`, margin + 4, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 40, 55);
        const titleDisplay = title.length > 70 ? `${title.slice(0, 70)}...` : title;
        doc.text(titleDisplay, margin + 26, y);
        y += 4;

        if (directUrl) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(2, 132, 199);
          const shortUrl = directUrl.length > 85 ? `${directUrl.slice(0, 85)}...` : directUrl;
          // Clickable link in PDF
          doc.textWithLink(shortUrl, margin + 6, y, { url: directUrl });
          y += 4.5;
        }

        if (ev.summary && ev.summary.trim().length > 15) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7.5);
          doc.setTextColor(110, 115, 125);
          const sumLines = doc.splitTextToSize(ev.summary.trim(), contentWidth - 10);
          ensureSpace(sumLines.length * 3.4 + 2);
          doc.text(sumLines, margin + 6, y);
          y += sumLines.length * 3.4 + 2;
        }
      });
    }

    y += 4;
  });

  // 6. Page Numbers and Disclaimers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 155, 165);
    doc.setDrawColor(225, 228, 232);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(
      "CONFIDENTIAL & VERIFIED // VeraCius AI Automated Investigation Core",
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  // 7. Trigger download
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `veracius-analysis-${dateStr}.pdf`;
  doc.save(filename);
}
