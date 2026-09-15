"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Authentication service is not configured. Missing Supabase credentials.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-foreground flex items-center justify-center p-6 font-sans selection:bg-neonRed/30 selection:text-neonRed-bright">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md surface-card p-8 space-y-6 shadow-2xl border border-graphite-border bg-graphite-surface rounded-2xl"
      >
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-graphite-elevated border border-graphite-border group-hover:border-neonRed/50 transition-colors mx-auto shadow-red-glow">
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

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-neonRed/10 border border-neonRed/40 text-neonRed flex items-start gap-2.5 font-mono text-xs"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-neonRed" />
              <span>Email</span>
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@veracius.ai"
              className="h-12 rounded-xl border-graphite-border bg-graphite-bg px-4 font-mono text-sm text-foreground focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744] focus:shadow-red-focus transition-all duration-300"
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-neonRed" />
              <span>Password</span>
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-12 rounded-xl border-graphite-border bg-graphite-bg px-4 font-mono text-sm text-foreground focus:border-[#FF1744] focus:ring-1 focus:ring-[#FF1744] focus:shadow-red-focus transition-all duration-300"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-xs font-bold uppercase tracking-wider shadow-red-glow border border-neonRed-bright/30 transition-all duration-300 flex items-center justify-center gap-2 animate-shimmer"
          >
            <span>{loading ? "SIGNING IN..." : "SIGN IN"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="pt-2 text-center space-y-3 font-mono text-xs text-muted-foreground">
          <div>
            <span>Don't have an account? </span>
            <Link
              href={next !== "/" ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              className="text-neonRed font-semibold hover:underline"
            >
              CREATE ACCOUNT
            </Link>
          </div>
          <div>
            <Link href="/" className="hover:text-accent transition-colors">
              ← RETURN TO HOMEPAGE
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-mono text-xs text-muted-foreground">LOADING...</div>}>
      <LoginForm />
    </Suspense>
  );
}
