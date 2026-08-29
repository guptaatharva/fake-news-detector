"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Search, Globe, Cpu, Sparkles, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navigation/Navbar";
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
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const headlineWord = {
    hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans selection:bg-neonRed/30 selection:text-neonRed-bright overflow-x-hidden">
      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-36 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Subtle atmospheric red glow behind hero */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-glow-bg pointer-events-none" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Step 1: Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-graphite-surface border border-graphite-border-sec shadow-[0_0_15px_rgba(255,23,68,0.12)]"
            >
              <Sparkles className="h-4 w-4 text-neonRed animate-pulse" />
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase font-semibold">
                AI-POWERED INFORMATION VERIFICATION
              </span>
            </motion.div>

            {/* Step 2: Headline Word-by-Word Reveal */}
            <motion.h1
              variants={headlineContainer}
              initial="hidden"
              animate="visible"
              className="font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05]"
            >
              <motion.span
                variants={headlineWord}
                className="inline-block bg-gradient-to-r from-[#FF1744] via-[#FF4D6D] to-[#FF1744] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,23,68,0.25)]"
              >
                VERIFY
              </motion.span>{" "}
              <motion.span variants={headlineWord} className="inline-block">
                WHAT
              </motion.span>
              <br />
              <motion.span variants={headlineWord} className="inline-block">
                MATTERS.
              </motion.span>
            </motion.h1>

            {/* Step 3: Supporting Paragraph */}
            <motion.p
              initial={{ opacity: 0, y: 25, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              VeraCius AI analyzes claims, articles, and online sources to uncover evidence and help you understand what deserves your trust.
            </motion.p>

            {/* Step 4: Magnetic CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <MagneticButton>
                <Link href="/dashboard">
                  <Button className="h-14 px-8 rounded-full text-base font-semibold bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground shadow-red-glow transition-all duration-300 hover:scale-105 border border-neonRed-bright/30 flex items-center gap-3 animate-shimmer">
                    <span>Start Verification</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </MagneticButton>

              <Link href="/about">
                <Button
                  variant="outline"
                  className="h-14 px-8 rounded-full text-base font-semibold bg-graphite-surface hover:bg-graphite-elevated hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] text-foreground border-graphite-border-sec hover:border-neonRed transition-all duration-300 hover:scale-105"
                >
                  Explore How It Works
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Step 5: Interactive Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16"
          >
            <LiveVerificationVisual />
          </motion.div>
        </div>
      </section>

      {/* ================= INTERACTIVE DEMO ================= */}
      <section className="relative border-t border-graphite-border bg-transparent">
        <InteractiveDemo />
      </section>

      {/* ================= TRUST ARCHITECTURE ================= */}
      <section className="relative border-t border-graphite-border bg-transparent">
        <TrustArchitecture />
      </section>

      {/* ================= NUANCED VERDICTS ================= */}
      <section className="relative bg-transparent overflow-hidden">
        {/* Smooth dark red/black gradient transition at the top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background pointer-events-none z-0" />
        
        {/* Ambient red glow matching the rest of the site */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-glow-bg opacity-50 pointer-events-none z-0" />
        
        {/* Subtle tech grid fading smoothly at the top and bottom edges */}
        <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] z-0" />
        
        <NuancedVerdictGuide />
      </section>

      {/* ================= SIGNALS NEWS FEED ================= */}
      <section className="relative py-28 border-t border-graphite-border bg-transparent">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SignalsFeed />
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative py-28 border-t border-graphite-border bg-transparent overflow-hidden">
        <RevealOnScroll className="mx-auto max-w-5xl px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-graphite-elevated border border-graphite-border shadow-red-glow mx-auto">
            <ShieldCheck className="h-8 w-8 text-neonRed" />
          </div>

          <h2 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
            Ready to Verify Information?
          </h2>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Experience real-time AI fact-checking backed by live web evidence and transparent source attribution.
          </p>

          <div className="pt-4">
            <MagneticButton>
              <Link href="/dashboard">
                <Button className="h-16 px-10 rounded-full text-base font-semibold bg-gradient-to-r from-neonRed to-neonRed-deep text-foreground shadow-red-glow transition-all duration-300 hover:scale-105 border border-neonRed-bright/30 inline-flex items-center gap-3 animate-shimmer">
                  <span>Launch Verification Workspace</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
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