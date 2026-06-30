import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-teal-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full border-b border-white/10 bg-black/50 backdrop-blur-md z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-teal-400 to-blue-500" />
            <span className="text-xl font-bold tracking-tight">VeriLens</span>
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

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <Badge
            variant="outline"
            className="mb-6 border-white/20 text-teal-300 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-sm"
          >
            AI-Powered Fact Checking v1.0
          </Badge>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Verify the truth with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500">
              Explainable AI.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed">
            Stop guessing. Instantly analyze news articles, social media posts,
            and screenshots. Get transparency with source citations,
            credibility scores, and logical reasoning.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-8 text-base bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 border-0 rounded-full text-white shadow-[0_0_40px_rgba(20,184,166,0.3)] transition-all hover:scale-105"
              >
                Start Verifying Free
              </Button>
            </Link>

            <Link href="/about">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base border-white/20 hover:bg-white/10 rounded-full transition-all"
              >
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Mockup */}
          <div className="mt-20 w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none rounded-2xl z-10" />

            <div className="h-[400px] w-full rounded-xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />

              <div className="animate-pulse w-16 h-16 rounded-full border-4 border-teal-500/30 border-t-teal-400 mb-6" />

              <p className="text-gray-400 font-mono text-sm">
                Analyzing source credibility...
              </p>

              <div className="w-64 h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                <div className="w-1/2 h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}