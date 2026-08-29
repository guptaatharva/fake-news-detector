"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LogOut, Terminal } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Footer from "@/components/ui/Footer";
import SystemStatus from "@/components/ui/SystemStatus";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-sans selection:bg-neonRed/30 selection:text-neonRed-bright">
      {/* Command Dashboard Navbar */}
      <header className="sticky top-0 z-50 border-b border-graphite-border bg-graphite-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          {/* Logo & Workspace Title */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group">
              <Link href="/">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-graphite-elevated border border-graphite-border group-hover:border-neonRed/50 transition-colors">
                  <Image 
                    src="/red-logo.png" 
                    alt="Veracius Logo" 
                    width={20} 
                    height={20} 
                    className="group-hover:scale-110 transition-transform duration-300 object-contain drop-shadow-[0_0_8px_rgba(255,23,68,0.8)]" 
                  />
                </div>
              </Link>
              <Link href="/dashboard" className="flex flex-col">
                <span className="font-display font-bold tracking-wider text-foreground">VERACIUS</span>
                <span className="text-[10px] font-mono text-neonRed uppercase tracking-widest">Command Core</span>
              </Link>
            </div>
            <div className="hidden lg:block">
              <SystemStatus />
            </div>

            <div className="hidden sm:flex h-6 w-px bg-[#241014]" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonRed opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neonRed"></span>
              </span>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                ENGINE ACTIVE
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={`h-10 px-4 rounded-full text-xs font-mono tracking-wider uppercase transition-all ${
                  pathname === "/dashboard"
                    ? "bg-graphite-elevated text-foreground border border-graphite-border-sec shadow-[0_0_15px_rgba(255,23,68,0.15)] font-semibold"
                    : "text-muted-foreground hover:text-accent hover:bg-graphite-surface hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)]"
                }`}
              >
                <Terminal className="mr-2 h-3.5 w-3.5" />
                Analyze Workspace
              </Button>
            </Link>

            <Link href="/dashboard/history">
              <Button
                variant="ghost"
                className={`h-10 px-4 rounded-full text-xs font-mono tracking-wider uppercase transition-all ${
                  pathname === "/dashboard/history"
                    ? "bg-graphite-elevated text-foreground border border-graphite-border-sec shadow-[0_0_15px_rgba(255,23,68,0.15)] font-semibold"
                    : "text-muted-foreground hover:text-accent hover:bg-graphite-surface hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)]"
                }`}
              >
                <History className="mr-2 h-3.5 w-3.5" />
                History Archive
              </Button>
            </Link>

            <div className="h-6 w-px bg-[#241014] mx-1" />

            <ThemeToggle />

            <Link href="/">
              <Button
                variant="outline"
                className="h-10 px-4 rounded-full text-xs font-mono text-muted-foreground hover:text-accent border-border hover:bg-accent/10"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Exit
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-8 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}