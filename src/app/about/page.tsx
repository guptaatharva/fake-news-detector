"use client";

import Link from "next/link";
import { ShieldCheck, Search, Globe, BadgeCheck, Cpu, BrainCircuit } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/ui/Footer";
import RevealOnScroll from "@/components/animation/RevealOnScroll";
import MagneticButton from "@/components/animation/MagneticButton";

export default function AboutPage() {
  const narrativeSections = [
    {
      step: "01",
      title: "The Problem",
      subtitle: "Static Memory vs Speed of Information",
      description: "Misinformation spreads in minutes across global networks. Traditional LLMs operate on frozen training weights cut off from present-day developments, frequently hallucinating plausible facts.",
      icon: ShieldCheck,
      accent: "text-neonRed border-neonRed/30 bg-neonRed/10",
    },
    {
      step: "02",
      title: "The Input",
      subtitle: "Multimodal Claim & Content Ingestion",
      description: "VeraCius accepts web article URLs, copied passages, or single sentence claims. Natural language processing parses the content into standalone, testable factual units.",
      icon: Search,
      accent: "text-neonRed-bright border-neonRed-bright/30 bg-neonRed/10",
    },
    {
      step: "03",
      title: "The Investigation",
      subtitle: "Autonomous Primary Source Search",
      description: "Rather than relying on internal memory, VeraCius triggers real-time web search engines to locate primary reporting, official press releases, and peer-reviewed documentation.",
      icon: Globe,
      accent: "text-neonRed border-neonRed/30 bg-neonRed/10",
    },
    {
      step: "04",
      title: "The Evidence",
      subtitle: "Scraping & Credibility Matrix",
      description: "Our scraper cleans web pages of ads, navigates paywalls when accessible, extracts article text, and scores author authority, site trust, and publication recency.",
      icon: Cpu,
      accent: "text-neonRed-label border-neonRed/30 bg-neonRed/10",
    },
    {
      step: "05",
      title: "The Verdict",
      subtitle: "Cross-Source Corroboration",
      description: "Claims are matched against collected evidence. Independent agreement across primary sources drives the calculation of a transparent confidence percentage.",
      icon: BadgeCheck,
      accent: "text-verificator-verified border-verificator-verified/30 bg-verificator-verified/10",
    },
    {
      step: "06",
      title: "The Explanation",
      subtitle: "Explainable AI Reasoning Chain",
      description: "We reveal the complete reasoning chain—from initial claim isolation to evidence quality assessment—giving users verifiable citations for every conclusion.",
      icon: BrainCircuit,
      accent: "text-neonRed border-neonRed/30 bg-neonRed/10",
    },
  ];

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans selection:bg-neonRed/30 selection:text-neonRed-bright">
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-36 pb-20 lg:pt-44 lg:pb-28 bg-transparent overflow-hidden">
        {/* Smooth dark red/black gradient transition at the top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background pointer-events-none z-0" />
        {/* Ambient red glow matching the rest of the site */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-red-glow-bg opacity-50 pointer-events-none z-0" />
        <RevealOnScroll className="mx-auto max-w-7xl px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-graphite-surface border border-graphite-border-sec">
            <span className="font-mono text-xs uppercase tracking-widest text-neonRed font-bold">
              ABOUT VERACIUS AI ARCHITECTURE
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight text-foreground">
            Understanding <br />
            <span className="bg-gradient-to-r from-[#FF1744] via-[#FF4D6D] to-[#FF1744] bg-clip-text text-transparent">
              VeraCius AI
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover how our autonomous AI agent searches the live internet, gathers trustworthy evidence, reasons over real-time information, and produces transparent fact-checking reports.
          </p>

          <div className="pt-4 flex justify-center gap-4">
            <MagneticButton>
              <Link 
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-14 px-8 rounded-full text-base font-semibold bg-gradient-to-r from-neonRed to-neonRed-deep text-foreground shadow-red-glow border border-neonRed-bright/30 animate-shimmer"
                )}
              >
                Launch Verification Workspace
              </Link>
            </MagneticButton>
          </div>
        </RevealOnScroll>
      </section>

      {/* Demo Video Section */}
      <section className="relative py-24 bg-transparent overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <RevealOnScroll className="text-center space-y-3 mb-12">
            <span className="font-mono text-xs text-neonRed font-bold uppercase tracking-widest">
              LIVE SYSTEM DEMONSTRATION
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-foreground">
              Watch VeraCius In Action
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              See how claims are parsed, scraped, and cross-referenced in real-time.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2} className="rounded-3xl overflow-hidden border border-graphite-border bg-graphite-surface shadow-2xl shadow-neonRed/10">
            <video
              controls
              poster="/vidback.png"
              className="w-full h-auto"
            >
              <source src="/VeraCius AI.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </RevealOnScroll>
        </div>
      </section>

      {/* 6-Step Storytelling Section */}
      <section id="pipeline" className="relative py-28 bg-transparent overflow-hidden">
        {/* Smooth dark red/black gradient transition at the top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background pointer-events-none z-0" />
        {/* Ambient red glow matching the rest of the site */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-glow-bg opacity-50 pointer-events-none z-0" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-16 relative z-10">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs text-neonRed font-bold uppercase tracking-widest">
              THE VERIFICATION NARRATIVE
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground">
              From Raw Claim to Verified Truth
            </h2>
            <p className="text-base text-muted-foreground">
              A 6-phase journey ensuring complete transparency and empirical rigor.
            </p>
          </RevealOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {narrativeSections.map((sec, i) => (
              <RevealOnScroll key={sec.step} delay={i * 0.1}>
                <div className="surface-card p-6 flex flex-col justify-between space-y-4 surface-card-hover border border-graphite-border bg-graphite-surface h-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        PHASE {sec.step}
                      </span>
                      <span className={`font-mono text-xs font-bold px-3 py-1 rounded-full border ${sec.accent}`}>
                        {sec.title.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold text-foreground">
                      {sec.subtitle}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {sec.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-graphite-border font-mono text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>STAGE {sec.step} PROTOCOL</span>
                    <span className="text-neonRed font-bold">VERIFIED</span>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Traditional AI vs VeraCius AI Section */}
      <section id="comparison" className="relative py-28 bg-transparent overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 space-y-16 relative z-10">
          <RevealOnScroll className="text-center max-w-3xl mx-auto space-y-4">
            <span className="font-mono text-xs text-neonRed font-bold uppercase tracking-widest">
              ARCHITECTURAL DIFFERENCE
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground">
              Traditional Memory AI vs VeraCius AI
            </h2>
            <p className="text-base text-muted-foreground">
              Most AI assistants answer from memory. VeraCius performs real-time investigation.
            </p>
          </RevealOnScroll>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Traditional AI */}
            <RevealOnScroll direction="left">
              <div className="p-8 rounded-3xl bg-graphite-surface border border-graphite-border space-y-6 h-full">
                <div className="flex items-center gap-4 pb-4 border-b border-graphite-border">
                  <div className="h-10 w-10 rounded-xl bg-neonRed/10 border border-neonRed/30 flex items-center justify-center text-neonRed font-bold">
                    ✕
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      Traditional LLM
                    </h3>
                    <p className="font-mono text-xs text-muted-foreground">MEMORY-BASED RESPONSES</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-neonRed font-bold">✕</span>
                    <span><strong>Static Training Cutoff:</strong> Cannot verify events occurring after model training.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-neonRed font-bold">✕</span>
                    <span><strong>Frequent Hallucinations:</strong> Confidently asserts false details without external checks.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-neonRed font-bold">✕</span>
                    <span><strong>No Source Attributions:</strong> Fails to provide testable, clickable primary links.</span>
                  </li>
                </ul>
              </div>
            </RevealOnScroll>

            {/* VeraCius AI */}
            <RevealOnScroll direction="right">
              <div className="p-8 rounded-3xl bg-graphite-surface border border-neonRed/40 shadow-red-glow space-y-6 h-full">
                <div className="flex items-center gap-4 pb-4 border-b border-graphite-border">
                  <div className="h-10 w-10 rounded-xl bg-verificator-verified/10 border border-verificator-verified/30 flex items-center justify-center text-verificator-verified font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      VeraCius AI
                    </h3>
                    <p className="font-mono text-xs text-neonRed font-bold">AUTONOMOUS VERIFICATION ENGINE</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-verificator-verified font-bold">✓</span>
                    <span><strong>Live Web Scraper & Search:</strong> Queries current internet primary sources on every demand.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-verificator-verified font-bold">✓</span>
                    <span><strong>Zero Hallucination Pipeline:</strong> Enforces evidence corroboration before scoring accuracy.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-verificator-verified font-bold">✓</span>
                    <span><strong>Full Citations & Snippets:</strong> Exposes extracted article text and original links.</span>
                  </li>
                </ul>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}