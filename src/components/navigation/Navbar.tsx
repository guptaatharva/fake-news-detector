"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LogOut, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MagneticButton from "@/components/animation/MagneticButton";
import SystemStatus from "@/components/ui/SystemStatus";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Analyze", href: "/dashboard" },
    { name: "History", href: "/dashboard/history" },
    { name: "About", href: "/about" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
        scrolled
          ? "border-b border-graphite-border-sec bg-graphite-surface/95 backdrop-blur-2xl shadow-[0_4px_30px_rgba(255,23,68,0.12)] py-3"
          : "border-b border-graphite-border/60 bg-graphite-bg/75 backdrop-blur-lg py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Brand Logo & System Status */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-6"
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-graphite-elevated border border-graphite-border group-hover:border-neonRed/50 transition-colors shadow-red-glow">
              <Image 
                src="/red-logo.png" 
                alt="Veracius Logo" 
                width={20} 
                height={20} 
                className="group-hover:scale-110 transition-transform duration-300 object-contain drop-shadow-[0_0_8px_rgba(255,23,68,0.8)]" 
              />
            </div>
            <span className="font-display text-xl font-bold tracking-wider text-foreground flex items-center gap-2">
              VERACIUS{" "}
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-neonRed-dark/40 text-neonRed border border-neonRed-dark/60">
                AI
              </span>
            </span>
          </Link>
          <div className="hidden lg:block">
            <SystemStatus />
          </div>
        </motion.div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-graphite-surface/80 p-1.5 rounded-full border border-graphite-border">
          {navLinks.map((link) => {
            const isExactMatch = pathname === link.href;
            const isAboutMain = link.name === "About" && pathname === "/about";
            const isActive = isExactMatch || isAboutMain;

            return (
              <Link
                key={link.name}
                href={link.href}
                className="relative px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-graphite-elevated border border-graphite-border-sec shadow-[0_0_15px_rgba(255,23,68,0.2)]"
                  />
                )}
                <span
                  className={`relative z-10 font-semibold transition-colors duration-200 ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-accent"
                  }`}
                >
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Primary CTA, Auth Controls & Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                title={user.user_metadata?.username ? `@${user.user_metadata.username}` : user.email ?? "Profile"}
                className="h-10 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-muted-foreground hover:text-accent border border-graphite-border hover:border-neonRed/50 hover:bg-graphite-elevated transition-all flex items-center gap-1.5"
              >
                <UserRound className="h-3.5 w-3.5 text-neonRed" />
                <span>PROFILE</span>
                {user.user_metadata?.username && (
                  <span className="hidden sm:inline-block max-w-28 truncate text-[10px] text-neonRed font-mono font-normal">
                    @{user.user_metadata.username}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="h-10 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-muted-foreground hover:text-neonRed border border-graphite-border hover:border-neonRed/50 hover:bg-neonRed/10 transition-all flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5 text-neonRed" />
                <span>LOG OUT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="h-10 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-muted-foreground hover:text-accent border border-graphite-border hover:border-neonRed/50 hover:bg-graphite-elevated transition-all flex items-center justify-center"
              >
                SIGN IN
              </Link>
              <Link
                href="/signup"
                className="h-10 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-neonRed border border-neonRed/40 hover:bg-neonRed/10 hover:border-neonRed transition-all flex items-center justify-center shadow-[0_0_10px_rgba(255,23,68,0.15)]"
              >
                CREATE ACCOUNT
              </Link>
            </div>
          )}

          <ThemeToggle />

          <MagneticButton>
            <Link 
              href="/dashboard" 
              className={cn(
                buttonVariants({ variant: "default" }),
                "hidden xl:flex h-11 px-5 rounded-full text-xs font-mono tracking-wider uppercase font-bold bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground shadow-red-glow border border-neonRed-bright/30 transition-all duration-300 hover:scale-105 active:scale-95 items-center gap-2 animate-shimmer"
              )}
            >
              <span>Analyze</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </MagneticButton>
        </motion.div>
      </div>
    </motion.header>
  );
}
