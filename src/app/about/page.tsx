"use client";

import Link from "next/link";
import Image from "next/image";
import Typewriter from "typewriter-effect";

import { Button } from "@/components/ui/button";
import logo from "../logo.png";
import {
  Shield,
  Search,
  BrainCircuit,
  Zap,
} from "lucide-react";

import {
  FileSearch,
  Globe,
  FileText,
  BadgeCheck,
} from "lucide-react";


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* ================= NAVBAR ================= */}

      <nav className="fixed top-0 w-full border-b border-white/10 bg-black/50 backdrop-blur-md z-50">
  <div className="container mx-auto flex h-16 items-center justify-between px-6">
    {/* Logo */}
    <Link href="/" className="flex items-center gap-3">
      <Image
        src={logo}
        alt="VeriLens Logo"
        width={42}
        height={42}
        priority
      />

      <span className="text-2xl font-bold tracking-tight">
        VeriLens
      </span>
    </Link>

    {/* Navigation */}
    <div className="flex items-center gap-4">
      <Link
        href="/"
        className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        Home
      </Link>

      <Link href="/dashboard">
        <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6">
          Get Started
        </Button>
      </Link>
    </div>
  </div>
</nav>

      {/* ================= HERO ================= */}

      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/aurora.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >

        {/* Dark Overlay */}

        <div className="absolute inset-0 bg-black/55" />

        {/* Aurora Glow */}

        <div className="absolute w-[900px] h-[900px] bg-teal-500/20 blur-[180px] rounded-full" />

        {/* Content */}

        <div className="relative z-10 max-w-5xl text-center px-8">

          <p className="tracking-[8px] text-teal-400 uppercase text-sm mb-6">
            About Us
          </p>

          <div className="min-h-[220px]">

            <h1 className="text-7xl md:text-8xl font-black leading-none">

              <Typewriter
                options={{
                  autoStart: true,
                  loop: false,
                  delay: 55,
                  cursor: "|",
                }}
                onInit={(typewriter) => {
                  typewriter
                    .typeString("Understanding")
                    .pauseFor(250)
                    .typeString("<br/>")
                    .typeString(
                      '<span class="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-transparent bg-clip-text">VeriLens AI</span>'
                    )
                    .start();
                }}
              />

            </h1>

          </div>

          <div className="max-w-4xl mx-auto mt-5">

            <Typewriter
              options={{
                autoStart: true,
                delay: 12,
                cursor: "",
              }}
              onInit={(typewriter) => {
                typewriter
                  .typeString(
                    "Discover how our autonomous AI agent searches the live internet, gathers trustworthy evidence, reasons over real-time information, and produces transparent fact-checking reports that anyone can understand."
                  )
                  .start();
              }}
            />

          </div>

          {/* Decorative Dots */}

          <div className="flex justify-center gap-3 mt-10">

            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <div className="w-2 h-2 rounded-full bg-cyan-400" />

            <div className="w-20 h-[2px] mt-[3px] bg-gradient-to-r from-cyan-400 to-transparent" />

          </div>

          {/* Buttons */}

          <div className="flex justify-center gap-5 mt-12">

            <Link href="/dashboard">

              <Button
                size="lg"
                className="rounded-full h-16 px-10 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:scale-105 transition"
              >
                Start Verifying Free
              </Button>

            </Link>

            <Link href="#pipeline">

              

            </Link>

          </div>

        </div>

        {/* Bottom Fade */}

        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-b from-transparent to-black" />

      </section>

      {/* ================= DEMO VIDEO ================= */}

<section className="relative py-36 bg-black overflow-hidden">

  {/* Background Glow */}

  <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[700px] bg-cyan-500/10 blur-[180px] rounded-full" />

  <div className="container mx-auto px-8 relative z-10">

    <div className="text-center mb-16">

      <p className="uppercase tracking-[6px] text-cyan-400 text-sm mb-5">
        Live Demonstration
      </p>

      <h2 className="text-6xl font-black mb-6">
        Watch VeriLens In Action
      </h2>

      <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
        See how VeriLens extracts claims, searches the web, gathers evidence,
        and produces transparent AI-powered fact-checking reports in real time.
      </p>

    </div>

    {/* Video */}

    <div className="max-w-6xl mx-auto">

      <div className="rounded-[32px] overflow-hidden border border-cyan-500/20 bg-[#0b0b0b] shadow-[0_0_60px_rgba(20,184,166,.15)]">

        <video
          controls
          poster="/modi.jpg"
          className="w-full"
        >
          <source src="/demo.mp4" type="video/mp4" />

          Your browser does not support the video tag.

        </video>

      </div>

    </div>

  </div>

</section>
      {/* ================= WHY VERILENS ================= */}

<section className="relative bg-black py-32 overflow-hidden">

  {/* Background Glow */}

  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-teal-500/10 blur-[180px]" />

  <div className="container mx-auto px-8 relative z-10">

    <div className="text-center">

      <p className="uppercase tracking-[6px] text-teal-400 text-sm mb-5">
        Our Mission
      </p>

      <h2 className="text-6xl font-black mb-6">
        Why VeriLens?
      </h2>

      <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
        We built VeriLens because misinformation spreads faster than facts.
        Instead of asking you to blindly trust AI, we show every step behind
        our reasoning with live evidence, transparent analysis, and explainable
        verdicts.
      </p>

    </div>

    {/* Feature Cards */}

    <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mt-20">

      {/* Card 1 */}

      <div className="group rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 hover:border-teal-400 transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_0_45px_rgba(20,184,166,.25)]">

        <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-8">

          <Shield className="w-10 h-10 text-cyan-400" />

        </div>

        <h3 className="text-2xl font-bold mb-4">
          Fight Misinformation
        </h3>

        <p className="text-gray-400 leading-8">
          Detect misleading news, manipulated stories and viral misinformation
          before it spreads further.
        </p>

      </div>

      {/* Card 2 */}

      <div className="group rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 hover:border-cyan-400 transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_0_45px_rgba(20,184,166,.25)]">

        <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-8">

          <Search className="w-10 h-10 text-cyan-400" />

        </div>

        <h3 className="text-2xl font-bold mb-4">
          Transparency First
        </h3>

        <p className="text-gray-400 leading-8">
          Every conclusion is backed by independent sources, citations and
          confidence scores instead of hidden reasoning.
        </p>

      </div>

      {/* Card 3 */}

      <div className="group rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 hover:border-purple-500 transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_0_45px_rgba(139,92,246,.25)]">

        <div className="w-20 h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-8">

          <BrainCircuit className="w-10 h-10 text-purple-400" />

        </div>

        <h3 className="text-2xl font-bold mb-4">
          AI-Powered Reasoning
        </h3>

        <p className="text-gray-400 leading-8">
          Our autonomous AI doesn't just retrieve information—it evaluates,
          compares and explains its final decision.
        </p>

      </div>

      {/* Card 4 */}

      <div className="group rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 hover:border-blue-500 transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_0_45px_rgba(59,130,246,.25)]">

        <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8">

          <Zap className="w-10 h-10 text-blue-400" />

        </div>

        <h3 className="text-2xl font-bold mb-4">
          Real-Time Verification
        </h3>

        <p className="text-gray-400 leading-8">
          Unlike conventional AI, VeriLens gathers live web evidence every time
          a claim is verified.
        </p>

      </div>

    </div>

  </div>

</section>
{/* ================= PIPELINE ================= */}

<section
  id="pipeline"
  className="relative bg-black py-36 overflow-hidden"
>

  {/* Background Glow */}

  <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-blue-500/10 blur-[220px]" />

  <div className="container mx-auto px-8 relative z-10">

    {/* Heading */}

    <div className="text-center mb-24">

      <p className="uppercase tracking-[6px] text-cyan-400 text-sm mb-5">
        How VeriLens Works
      </p>

      <h2 className="text-6xl font-black mb-6">
        Our 4-Step Verification Process
      </h2>

      <p className="text-gray-400 text-xl max-w-3xl mx-auto">
        Every verification request follows an autonomous pipeline that gathers
        live evidence before generating a final explainable verdict.
      </p>

    </div>

    {/* Timeline */}

    <div className="relative">

      {/* Center Line */}

      <div className="absolute top-12 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-40 hidden lg:block" />

      <div className="grid lg:grid-cols-4 gap-8">

        {/* STEP 1 */}

        <div className="relative group">

          <div className="absolute -top-4 left-8 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center font-bold shadow-lg">
            1
          </div>

          <div className="mt-8 rounded-3xl border border-cyan-500/40 bg-white/[0.03] backdrop-blur-xl p-8 hover:-translate-y-3 hover:border-cyan-400 transition duration-300 hover:shadow-[0_0_35px_rgba(20,184,166,.35)]">

            <FileSearch className="w-12 h-12 text-cyan-400 mb-6" />

            <h3 className="text-2xl font-bold mb-5">
              Claim Extraction
            </h3>

            <p className="text-gray-400 leading-8">
              VeriLens reads the submitted article, social media post or URL
              and extracts the most important factual claims that can be
              independently verified.
            </p>

          </div>

        </div>

        {/* STEP 2 */}

        <div className="relative group">

          <div className="absolute -top-4 left-8 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center font-bold shadow-lg">
            2
          </div>

          <div className="mt-8 rounded-3xl border border-blue-500/40 bg-white/[0.03] backdrop-blur-xl p-8 hover:-translate-y-3 hover:border-blue-400 transition duration-300 hover:shadow-[0_0_35px_rgba(59,130,246,.35)]">

            <Globe className="w-12 h-12 text-blue-400 mb-6" />

            <h3 className="text-2xl font-bold mb-5">
              Live Web Search
            </h3>

            <p className="text-gray-400 leading-8">
              The AI searches trusted independent news websites using live web
              search instead of relying on outdated training knowledge.
            </p>

          </div>

        </div>

        {/* STEP 3 */}

        <div className="relative group">

          <div className="absolute -top-4 left-8 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold shadow-lg">
            3
          </div>

          <div className="mt-8 rounded-3xl border border-purple-500/40 bg-white/[0.03] backdrop-blur-xl p-8 hover:-translate-y-3 hover:border-purple-400 transition duration-300 hover:shadow-[0_0_35px_rgba(168,85,247,.35)]">

            <FileText className="w-12 h-12 text-purple-400 mb-6" />

            <h3 className="text-2xl font-bold mb-5">
              Evidence Scraping
            </h3>

            <p className="text-gray-400 leading-8">
              VeriLens visits each trusted source, removes advertisements and
              extracts only the meaningful article content for analysis.
            </p>

          </div>

        </div>

        {/* STEP 4 */}

        <div className="relative group">

          <div className="absolute -top-4 left-8 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center font-bold shadow-lg">
            4
          </div>

          <div className="mt-8 rounded-3xl border border-pink-500/40 bg-white/[0.03] backdrop-blur-xl p-8 hover:-translate-y-3 hover:border-pink-400 transition duration-300 hover:shadow-[0_0_35px_rgba(236,72,153,.35)]">

            <BadgeCheck className="w-12 h-12 text-pink-400 mb-6" />

            <h3 className="text-2xl font-bold mb-5">
              AI Verdict
            </h3>

            <p className="text-gray-400 leading-8">
              Finally, the AI compares all collected evidence and produces a
              transparent verdict with confidence score, explanation and source
              citations.
            </p>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>
{/* ================= COMPARISON ================= */}

<section className="relative py-36 bg-[#050505] overflow-hidden">

  {/* Background Glow */}

  <div className="absolute right-0 top-20 w-[700px] h-[700px] rounded-full bg-cyan-500/10 blur-[220px]" />

  <div className="container mx-auto px-8 relative z-10">

    <div className="text-center mb-24">

      <p className="uppercase tracking-[6px] text-cyan-400 text-sm mb-5">
        Why We Are Different
      </p>

      <h2 className="text-6xl font-black mb-6">
        Traditional AI vs VeriLens AI
      </h2>

      <p className="text-xl text-gray-400 max-w-3xl mx-auto">
        Most AI assistants answer from memory. VeriLens performs real-time
        investigation before answering.
      </p>

    </div>

    <div className="grid lg:grid-cols-2 gap-10">

      {/* Traditional AI */}

      <div className="rounded-[32px] border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-900/5 backdrop-blur-xl p-10">

        <div className="flex items-center gap-4 mb-10">

          <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center text-3xl">
            ❌
          </div>

          <div>

            <h3 className="text-4xl font-bold">
              Traditional AI
            </h3>

            <p className="text-red-300 mt-1">
              Memory-Based Responses
            </p>

          </div>

        </div>

        <div className="space-y-8">

          <div className="border-b border-white/5 pb-6">

            <h4 className="font-bold text-xl mb-3">
              Static Knowledge
            </h4>

            <p className="text-gray-400 leading-8">
              Relies mainly on information learned during training and may not
              know the latest events.
            </p>

          </div>

          <div className="border-b border-white/5 pb-6">

            <h4 className="font-bold text-xl mb-3">
              Hallucinations
            </h4>

            <p className="text-gray-400 leading-8">
              Can confidently generate incorrect or fabricated information
              without realizing it.
            </p>

          </div>

          <div className="border-b border-white/5 pb-6">

            <h4 className="font-bold text-xl mb-3">
              Limited Transparency
            </h4>

            <p className="text-gray-400 leading-8">
              Often provides answers without showing exactly where the
              information came from.
            </p>

          </div>

          <div>

            <h4 className="font-bold text-xl mb-3">
              No Live Investigation
            </h4>

            <p className="text-gray-400 leading-8">
              Usually does not search today's internet before responding.
            </p>

          </div>

        </div>

      </div>

      {/* VeriLens */}

      <div className="rounded-[32px] border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10 backdrop-blur-xl p-10 shadow-[0_0_70px_rgba(20,184,166,.12)]">

        <div className="flex items-center gap-4 mb-10">

          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-3xl">
            ✅
          </div>

          <div>

            <h3 className="text-4xl font-bold">
              VeriLens AI
            </h3>

            <p className="text-cyan-300 mt-1">
              Autonomous Fact-Checking Agent
            </p>

          </div>

        </div>

        <div className="space-y-8">

          <div className="border-b border-white/5 pb-6">

            <h4 className="font-bold text-xl mb-3">
              Live Web Search
            </h4>

            <p className="text-gray-300 leading-8">
              Searches the live internet for every verification request using
              independent news sources.
            </p>

          </div>

          <div className="border-b border-white/5 pb-6">

            <h4 className="font-bold text-xl mb-3">
              Evidence Collection
            </h4>

            <p className="text-gray-300 leading-8">
              Uses Puppeteer and Mozilla Readability to collect fresh article
              content instead of relying on memory.
            </p>

          </div>

          <div className="border-b border-white/5 pb-6">

            <h4 className="font-bold text-xl mb-3">
              Explainable Reasoning
            </h4>

            <p className="text-gray-300 leading-8">
              Every verdict includes confidence scores, reasoning and supporting
              citations.
            </p>

          </div>

          <div>

            <h4 className="font-bold text-xl mb-3">
              Anti-Circular Verification
            </h4>

            <p className="text-gray-300 leading-8">
              Prevents the original article from being used as evidence to prove
              itself, ensuring unbiased verification.
            </p>

          </div>

        </div>

      </div>

    </div>

    {/* Bottom Statistics */}

    <div className="grid md:grid-cols-4 gap-8 mt-24">

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">

        <h3 className="text-5xl font-black text-cyan-400">
          4
        </h3>

        <p className="mt-3 text-gray-400">
          Verification Stages
        </p>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">

        <h3 className="text-5xl font-black text-cyan-400">
          100%
        </h3>

        <p className="mt-3 text-gray-400">
          Live Evidence Based
        </p>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">

        <h3 className="text-5xl font-black text-cyan-400">
          AI
        </h3>

        <p className="mt-3 text-gray-400">
          Explainable Reasoning
        </p>

      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">

        <h3 className="text-5xl font-black text-cyan-400">
          ∞
        </h3>

        <p className="mt-3 text-gray-400">
          Independent Sources
        </p>

      </div>

    </div>

  </div>

</section>

    </div>
  );
}