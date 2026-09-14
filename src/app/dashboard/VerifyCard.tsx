"use client";

import { useRef, useState } from "react";
import { ShieldCheck, Link2, FileText, Loader2, ImageIcon, FileUp, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface VerifyCardProps {
  url: string;
  text: string;
  isLoading: boolean;
  setUrl: (value: string) => void;
  setText: (value: string) => void;
  handleAnalyze: (mode: "url" | "text", options?: { skipCache?: boolean }) => void;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type OcrStatus = "idle" | "uploading" | "success" | "error";

export default function VerifyCard({
  url,
  text,
  isLoading,
  setUrl,
  setText,
  handleAnalyze,
}: VerifyCardProps) {
  const [mode, setMode] = useState<"url" | "text" | "claim">("url");
  const [claimInput, setClaimInput] = useState("");

  // Screenshot upload / OCR (§REMAINING.md — image upload). Extracted text
  // lands in the same "Paste Text" input the user can review before running
  // verification — nothing downstream of extraction changes.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrFileName, setOcrFileName] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  const handleClaimSubmit = () => {
    setText(claimInput);
    handleAnalyze("text");
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error/retry
    if (!file) return;

    setOcrError(null);
    setOcrFileName(file.name);

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setOcrStatus("error");
      setOcrError("Unsupported format — use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setOcrStatus("error");
      setOcrError(`Image too large — max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`);
      return;
    }

    setOcrStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analyze/extract-image", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not read text from this image.");

      setText(data.text);
      setMode("text");
      setOcrStatus("success");
    } catch (err: any) {
      setOcrStatus("error");
      setOcrError(err.message || "Could not read text from this image.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="surface-card p-6 lg:p-8 space-y-6 shadow-xl border border-graphite-border bg-graphite-surface"
    >
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-graphite-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-graphite-elevated border border-graphite-border shadow-red-glow">
          <ShieldCheck className="h-6 w-6 text-neonRed" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            VERIFY INFORMATION
          </h2>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            GIVE VERACIUS SOMETHING TO INVESTIGATE
          </p>
        </div>
      </div>

      {/* Mode Selector Tabs with Animated Sliding Pill */}
      <div className="grid grid-cols-3 rounded-2xl bg-graphite-bg p-1 border border-graphite-border relative">
        {(["url", "text", "claim"] as const).map((tabMode) => {
          const isActive = mode === tabMode;
          const label = tabMode.toUpperCase();
          const Icon = tabMode === "url" ? Link2 : tabMode === "text" ? FileText : MessageSquare;

          return (
            <button
              key={tabMode}
              type="button"
              onClick={() => setMode(tabMode)}
              aria-pressed={isActive}
              aria-label={`Switch to ${label} verification mode`}
              className="relative flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-mono tracking-wider transition-colors z-10 font-bold"
            >
              {isActive && (
                <motion.div
                  layoutId="verify-mode-tab"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-neonRed to-neonRed-deep shadow-red-glow"
                />
              )}
              <Icon className={`h-3.5 w-3.5 relative z-10 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`relative z-10 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Input Workspaces */}
      {mode === "url" && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="verify-url-input" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              ARTICLE OR WEBPAGE URL
            </label>
            <Input
              id="verify-url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://news-website.com/article/12345..."
              disabled={isLoading}
              className="h-14 rounded-2xl border-graphite-border bg-graphite-bg px-5 font-mono text-sm text-foreground focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744] shadow-none focus:shadow-red-focus transition-all duration-300"
            />
          </div>

          <Button
            onClick={() => handleAnalyze("url")}
            disabled={!url || isLoading}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-sm tracking-wider uppercase font-bold shadow-red-glow border border-neonRed-bright/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] animate-shimmer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                RUNNING VERIFICATION PIPELINE...
              </span>
            ) : (
              "RUN VERIFICATION"
            )}
          </Button>
        </motion.div>
      )}

      {mode === "text" && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="verify-text-input" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              ARTICLE TEXT OR SOCIAL PASSAGE
            </label>
            <Textarea
              id="verify-text-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the news report, social media claim, or article body here..."
              disabled={isLoading}
              className="min-h-[200px] rounded-2xl border-graphite-border bg-graphite-bg p-5 font-sans text-sm text-foreground focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744] focus:shadow-red-focus transition-all duration-300 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>WORDS: <strong className="text-neonRed-label">{words}</strong></span>
            <span>CHARACTERS: <strong className="text-neonRed-label">{text.length}</strong></span>
          </div>

          <Button
            onClick={() => handleAnalyze("text")}
            disabled={text.length < 20 || isLoading}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-sm tracking-wider uppercase font-bold shadow-red-glow border border-neonRed-bright/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] animate-shimmer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                RUNNING VERIFICATION PIPELINE...
              </span>
            ) : (
              "RUN VERIFICATION"
            )}
          </Button>
        </motion.div>
      )}

      {mode === "claim" && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="verify-claim-input" className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              SPECIFIC FACTUAL CLAIM
            </label>
            <Input
              id="verify-claim-input"
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="e.g., 'Global renewable energy output surpassed 40% in 2025.'"
              disabled={isLoading}
              className="h-14 rounded-2xl border-graphite-border bg-graphite-bg px-5 font-sans text-sm text-foreground focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744] focus:shadow-red-focus transition-all duration-300"
            />
          </div>

          <Button
            onClick={handleClaimSubmit}
            disabled={!claimInput || isLoading}
            className="h-14 w-full rounded-2xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-sm tracking-wider uppercase font-bold shadow-red-glow border border-neonRed-bright/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] animate-shimmer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                RUNNING VERIFICATION PIPELINE...
              </span>
            ) : (
              "RUN VERIFICATION"
            )}
          </Button>
        </motion.div>
      )}

      {/* Auxiliary Dropzones */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-graphite-border">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleImageSelected}
          aria-label="Upload a screenshot to extract text from"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || ocrStatus === "uploading"}
          title={ocrStatus === "error" ? ocrError || undefined : undefined}
          className={`w-full p-4 rounded-2xl border border-dashed text-center space-y-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            ocrStatus === "error"
              ? "border-verificator-false/50 bg-verificator-false/5"
              : "border-graphite-border bg-graphite-bg/60 hover:border-neonRed/40"
          }`}
        >
          {ocrStatus === "uploading" ? (
            <>
              <Loader2 className="mx-auto h-5 w-5 text-neonRed animate-spin" />
              <p className="font-mono text-xs font-semibold text-foreground">READING IMAGE...</p>
              <p className="font-mono text-[10px] text-muted-foreground truncate">{ocrFileName}</p>
            </>
          ) : ocrStatus === "success" ? (
            <>
              <CheckCircle2 className="mx-auto h-5 w-5 text-verificator-verified" />
              <p className="font-mono text-xs font-semibold text-foreground">TEXT EXTRACTED</p>
              <p className="font-mono text-[10px] text-verificator-verified">REVIEW IN &quot;TEXT&quot; TAB</p>
            </>
          ) : ocrStatus === "error" ? (
            <>
              <AlertCircle className="mx-auto h-5 w-5 text-verificator-false" />
              <p className="font-mono text-xs font-semibold text-foreground">UPLOAD FAILED — RETRY</p>
              <p className="font-mono text-[10px] text-verificator-false truncate">{ocrError}</p>
            </>
          ) : (
            <>
              <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="font-mono text-xs font-semibold text-foreground">SCREENSHOT UPLOAD</p>
              <p className="font-mono text-[10px] text-muted-foreground">PNG, JPG, OR WEBP — TEXT ONLY</p>
            </>
          )}
        </button>

        <div className="p-4 rounded-2xl border border-dashed border-graphite-border bg-graphite-bg/60 text-center space-y-1 hover:border-neonRed/40 transition-colors">
          <FileUp className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="font-mono text-xs font-semibold text-foreground">DOCUMENT / PDF</p>
          <p className="font-mono text-[10px] text-neonRed-bright">FEATURE IN BETA</p>
        </div>
      </div>
    </motion.div>
  );
}
