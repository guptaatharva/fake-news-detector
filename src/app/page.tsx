"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "@/components/ui/Footer";
import SignalsFeed from "@/components/ui/SignalsFeed";
import LiveVerificationVisual from "@/components/hero/LiveVerificationVisual";
import InteractiveDemo from "@/components/ui/InteractiveDemo";
import TrustArchitecture from "@/components/ui/TrustArchitecture";
import NuancedVerdictGuide from "@/components/ui/NuancedVerdictGuide";
import RevealOnScroll from "@/components/animation/RevealOnScroll";
import MagneticButton from "@/components/animation/MagneticButton";

export default function Home() {
  // Headline word-by-word reveal variants
  const headlineContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const headlineWord = {
    hidden: { opacity: 0, y: 35, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans selection:bg-neonRed/30 selection:text-neonRed-bright overflow-x-hidden">
      {/* ================= HERO SECTION (Orchid Cinematic Composition) ================= */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28 lg:pt-52 lg:pb-36 overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-center">
        {/* Atmospheric layered illumination */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] hero-atmospheric-bloom pointer-events-none" />

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-7">
            {/* Step 1: Restrained Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-card/60 dark:bg-white/[0.04] border border-border/80 dark:border-white/10 shadow-[0_0_20px_rgba(255,23,68,0.12)] backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonRed opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neonRed" />
              </span>
              <span className="font-mono text-[11px] sm:text-xs tracking-widest text-muted-foreground uppercase font-semibold">
                AI-POWERED INFORMATION VERIFICATION
              </span>
            </motion.div>

            {/* Step 2: High-Impact Editorial Headline */}
            <motion.h1
              variants={headlineContainer}
              initial="hidden"
              animate="visible"
              className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[-0.04em] leading-[0.96] sm:leading-[0.92]"
            >
              <motion.span
                variants={headlineWord}
                className="inline-block bg-gradient-to-r from-neonRed via-[#FF4D6D] to-neonRed bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(255,23,68,0.35)]"
              >
                VERIFY
              </motion.span>{" "}
              <motion.span variants={headlineWord} className="inline-block text-foreground">
                WHAT
              </motion.span>
              <br />
              <motion.span variants={headlineWord} className="inline-block text-foreground">
                MATTERS.
              </motion.span>
            </motion.h1>

            {/* Step 3: Supporting Statement */}
            <motion.p
              initial={{ opacity: 0, y: 25, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed font-sans"
            >
              VeraCius AI analyzes claims, web sources, and live reporting in real time to isolate evidence, cross-reference authority, and restore confidence in information.
            </motion.p>

            {/* Step 4: Intentional CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3"
            >
              <MagneticButton>
                <Link 
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-13 sm:h-14 px-8 sm:px-10 rounded-full text-sm sm:text-base font-semibold bg-gradient-to-r from-neonRed to-[#D50032] hover:from-[#FF4D6D] hover:to-neonRed text-white shadow-[0_0_30px_rgba(255,23,68,0.4)] transition-all duration-300 hover:scale-105 border border-neonRed-bright/40 flex items-center gap-3 animate-shimmer"
                  )}
                >
                  <span>Start Verification</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </MagneticButton>

              <Link 
                href="/about"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-13 sm:h-14 px-8 sm:px-9 rounded-full text-sm sm:text-base font-medium bg-card/60 dark:bg-white/[0.04] backdrop-blur-xl hover:bg-card/90 text-foreground border-border/80 dark:border-white/15 hover:border-neonRed/50 hover:shadow-[0_0_20px_rgba(255,23,68,0.18)] transition-all duration-300 hover:scale-105"
                )}
              >
                Explore How It Works
              </Link>
            </motion.div>

            {/* Step 5: Technical Engine Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-6 sm:gap-x-8 pt-5 text-[11px] sm:text-xs font-mono text-muted-foreground/80 tracking-wider uppercase font-medium"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neonRed" />
                <span>Live Web Evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neonRed" />
                <span>Multi-Source Corroboration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neonRed" />
                <span>Zero-Hallucination Pipeline</span>
              </div>
            </motion.div>
          </div>

          {/* Step 6: Console-Grade Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 sm:mt-20"
          >
            <LiveVerificationVisual />
          </motion.div>
        </div>
      </section>

      {/* ================= INTERACTIVE DEMO ================= */}
      <section className="relative border-t border-border/60 dark:border-white/10 bg-transparent">
        <InteractiveDemo />
      </section>

      {/* ================= TRUST ARCHITECTURE ================= */}
      <section className="relative border-t border-border/60 dark:border-white/10 bg-transparent">
        <TrustArchitecture />
      </section>

      {/* ================= NUANCED VERDICTS ================= */}
      <section className="relative border-t border-border/60 dark:border-white/10 bg-transparent overflow-hidden">
        {/* Smooth gradient transition and ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background pointer-events-none z-0" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] hero-atmospheric-bloom opacity-40 pointer-events-none z-0" />
        
        <NuancedVerdictGuide />
      </section>

      {/* ================= SIGNALS NEWS FEED ================= */}
      <section className="relative py-24 sm:py-32 border-t border-border/60 dark:border-white/10 bg-transparent">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SignalsFeed />
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative py-28 sm:py-36 border-t border-border/60 dark:border-white/10 bg-transparent overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neonRed/[0.03] to-transparent pointer-events-none" />
        <RevealOnScroll className="mx-auto max-w-4xl px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-card border border-border shadow-[0_0_25px_rgba(255,23,68,0.25)] mx-auto">
            <ShieldCheck className="h-8 w-8 text-neonRed" />
          </div>

          <h2 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground">
            Ready to Verify Information?
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Experience real-time AI fact-checking backed by live web evidence and transparent source attribution.
          </p>

          <div className="pt-2">
            <MagneticButton>
              <Link 
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-15 sm:h-16 px-9 sm:px-11 rounded-full text-base font-semibold bg-gradient-to-r from-neonRed to-[#D50032] text-white shadow-[0_0_35px_rgba(255,23,68,0.4)] transition-all duration-300 hover:scale-105 border border-neonRed-bright/40 inline-flex items-center gap-3 animate-shimmer"
                )}
              >
                <span>Launch Verification Workspace</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </MagneticButton>
          </div>
        </RevealOnScroll>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}