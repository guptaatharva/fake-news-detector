"use client";

import Link from "next/link";
import Image from "next/image";
import Typewriter from "typewriter-effect";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import logo from "./logo.png";
import NewsSection from "@/components/ui/NewsSection";

export default function Home() {
 return (
  <div className="min-h-screen bg-black text-white selection:bg-teal-500/30">

    {/* ================= NAVBAR ================= */}
    <nav className="fixed top-0 w-full border-b border-white/10 bg-black/50 backdrop-blur-md z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">

        <div className="flex items-center gap-3">
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
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
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

    <main
      className="relative pt-32 pb-28 lg:pt-48 lg:pb-36 overflow-hidden bg-cover bg-center"
      style={{
        backgroundImage: "url('/aurora.png')",
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/65 z-0"></div>

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-teal-500/20 blur-[180px] rounded-full pointer-events-none z-0" />

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">

        <Badge
          variant="outline"
          className="mb-6 border-white/20 text-teal-300 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-sm"
        >
          AI-Powered Fact Checking v1.0
        </Badge>

        <div className="min-h-[190px] flex items-center justify-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
            <Typewriter
              options={{
                autoStart: true,
                loop: false,
                delay: 60,
                cursor: "|",
              }}
              onInit={(typewriter) => {
                typewriter
                  .typeString("Verify the truth with")
                  .pauseFor(200)
                  .typeString("<br/>")
                  .typeString(
                    '<span class="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500">VeriLens AI.</span>'
                  )
                  .start();
              }}
            />
          </h1>
        </div>

        <div className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed min-h-[120px]">
          <Typewriter
            options={{
              autoStart: true,
              loop: false,
              delay: 15,
              cursor: "",
            }}
            onInit={(typewriter) => {
              typewriter
                .typeString(
                  "Stop guessing. Instantly analyze news articles, social media posts, and screenshots. Get transparency with source citations, credibility scores, and logical reasoning."
                )
                .start();
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="h-14 px-8 text-base bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 rounded-full text-white shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:scale-105 transition-all"
            >
              Start Verifying Free
            </Button>
          </Link>

          <Link href="/about">
  <Button
    size="lg"
    variant="outline"
    className="h-14 px-8 text-base text-black border-white/20 hover:bg-white/70 rounded-full transition-all hover:scale-105"
  >
    See How It Works
  </Button>
</Link>
        </div>

      </div>
      {/* Bottom Fade */}
<div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-b from-transparent via-black/40 to-[#050505] pointer-events-none z-20" />
    </main>

    {/* ================= NEWS SECTION ================= */}

    <section className="relative bg-[#050505] pt-8 pb-24 overflow-hidden">

      {/* Neon Glow */}
      <div className="absolute inset-0 pointer-events-none">
    <div
      className="absolute left-1/2 top-0
      -translate-x-1/2
      w-[1400px]
      h-[600px]
      rounded-full
      bg-teal-500/8
      blur-[250px]"
    />
  </div>

      <div className="container mx-auto px-6 relative z-10">
        <NewsSection />
      </div>
      

    </section>

  </div>
);
}