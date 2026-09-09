"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackgroundCanvas from "@/components/ui/BackgroundCanvas";

export default function LoginPage() {
  const [username, setUsername] = useState("demo");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn("credentials", {
        username: username || "demo",
        callbackUrl: "/dashboard",
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-foreground flex items-center justify-center p-6 font-sans selection:bg-neonRed/30 selection:text-neonRed-bright">

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md surface-card p-8 space-y-6 shadow-2xl border border-graphite-border bg-graphite-surface"
      >
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-graphite-elevated border border-graphite-border group-hover:border-neonRed/50 transition-colors mx-auto">
              <ShieldCheck className="h-6 w-6 text-neonRed drop-shadow-[0_0_8px_rgba(255,23,68,0.5)]" />
            </div>
          </Link>

          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider text-foreground">
              VERACIUS <span className="text-neonRed font-mono text-sm">AUTH</span>
            </h1>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mt-1">
              INTELLIGENCE PORTAL ACCESS
            </p>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              DEMO ACCOUNT USERNAME
            </label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g., demo)"
              className="h-12 rounded-xl border-graphite-border bg-graphite-bg px-4 font-mono text-sm text-foreground focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744] focus:shadow-red-focus transition-all duration-300"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-xs font-bold uppercase tracking-wider shadow-red-glow border border-neonRed-bright/30 transition-all duration-300 flex items-center justify-center gap-2 animate-shimmer"
          >
            <span>{loading ? "AUTHENTICATING..." : "ENTER WORKSPACE"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="p-4 rounded-xl bg-graphite-bg/80 border border-graphite-border text-center space-y-1 font-mono text-xs text-muted-foreground">
          <p className="text-neonRed font-semibold">DEMO MODE ACTIVE</p>
          <p className="text-[10px]">No password required for instant trial access.</p>
        </div>

        <div className="text-center">
          <Link href="/" className="font-mono text-xs text-muted-foreground hover:text-accent transition-colors">
            ← RETURN TO HOMEPAGE
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
