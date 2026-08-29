"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-graphite-border bg-graphite-sub pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-graphite-border/70">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-graphite-elevated border border-graphite-border">
                <ShieldCheck className="h-5 w-5 text-neonRed" />
              </div>
              <span className="font-display text-xl font-bold tracking-wider text-foreground">
                VERACIUS <span className="text-neonRed font-mono text-sm">AI</span>
              </span>
            </div>
            <p className="font-mono text-xs tracking-wider text-neonRed-label uppercase font-semibold">
              "Truth, Verified by Intelligence."
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              An advanced AI verification platform analyzing web sources, cross-referencing claims, and generating transparent fact-checking reports.
            </p>
            
            <div className="pt-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonRed opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neonRed"></span>
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                VERIFICATION PIPELINE ONLINE
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
              PLATFORM WORKSPACE
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-neonRed transition-colors">
                  Live Verification Workspace
                </Link>
              </li>
              <li>
                <Link href="/dashboard/history" className="hover:text-neonRed transition-colors">
                  Intelligence Archive
                </Link>
              </li>
              <li>
                <Link href="/about#pipeline" className="hover:text-neonRed transition-colors">
                  Autonomous Pipeline
                </Link>
              </li>
              <li>
                <Link href="/about#comparison" className="hover:text-neonRed transition-colors">
                  Architectural Comparison
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & System Engine */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-foreground font-bold">
              VERIFICATION ENGINE
            </h4>
            <div className="p-4 rounded-2xl bg-graphite-surface border border-graphite-border space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">ENGINE MODEL</span>
                <span className="text-neonRed-bright font-semibold">VERACIUS-AI v2.4</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">WEB SCRAPER</span>
                <span className="text-foreground font-semibold">PUPPETEER + READABILITY</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">EVIDENCE SEARCH</span>
                <span className="text-verificator-verified font-semibold">MULTI-SOURCE LIVE SEARCH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <p>© {new Date().getFullYear()} VeraCius AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-accent transition-colors">
              ABOUT SYSTEM
            </Link>
            <Link href="/dashboard" className="hover:text-accent transition-colors">
              VERIFY NOW
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
