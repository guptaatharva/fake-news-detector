"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VeraCius AI App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full surface-card p-8 text-center space-y-6 border border-graphite-border-sec bg-graphite-surface shadow-2xl">
        <div className="h-16 w-16 rounded-3xl bg-neonRed/10 border border-neonRed/30 flex items-center justify-center mx-auto text-neonRed">
          <AlertTriangle className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs text-neonRed font-bold uppercase tracking-widest">
            SYSTEM ANOMALY DETECTED
          </span>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Something Went Wrong
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An unexpected error occurred during page rendering. You can retry the operation or return to the main workspace.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-xs font-bold uppercase tracking-wider shadow-red-glow border border-neonRed-bright/30 flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl bg-graphite-bg border-graphite-border text-muted-foreground hover:text-accent hover:bg-graphite-elevated hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>Return Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
