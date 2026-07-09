import Link from "next/link";
import Image from "next/image";
import { LogOut, History, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "../logo.png";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">

      {/* Aurora Glow */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[180px]" />

        <div className="absolute bottom-0 -left-40 h-[650px] w-[650px] rounded-full bg-cyan-500/10 blur-[180px]" />

        <div className="absolute top-40 -right-40 h-[650px] w-[650px] rounded-full bg-blue-500/10 blur-[180px]" />
      </div>

      {/* Background Grid */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right,#ffffff 1px,transparent 1px),
            linear-gradient(to bottom,#ffffff 1px,transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <Image
              src={logo}
              alt="VeraCius"
              width={46}
              height={46}
              priority
            />

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                VeraCius AI
              </h1>

              <p className="text-xs text-teal-400">
                AI Fact Checker
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">

            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="rounded-full text-white hover:bg-white/10"
              >
                <Home className="mr-2 h-4 w-4" />
                Analyze
              </Button>
            </Link>

            <Link href="/dashboard/history">
              <Button
                variant="ghost"
                className="rounded-full text-white hover:bg-white/10"
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </Link>

            <div className="h-8 w-px bg-white/10" />

            <Link href="/">
              <Button className="rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-6 hover:scale-105 transition-all">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </Link>

          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {children}
      </main>

    </div>
  );
}