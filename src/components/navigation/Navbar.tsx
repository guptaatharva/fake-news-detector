"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, LogOut, UserRound, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MagneticButton from "@/components/animation/MagneticButton";
import SystemStatus from "@/components/ui/SystemStatus";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Analyze", href: "/dashboard" },
    { name: "History", href: "/dashboard/history" },
    { name: "About", href: "/about" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${
        scrolled
          ? "border-b border-border/70 bg-background/80 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] py-3"
          : "border-b border-border/40 bg-background/60 backdrop-blur-xl py-4 lg:py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Brand Logo & System Status */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-5 sm:gap-6"
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card border border-border group-hover:border-neonRed/50 transition-all duration-300 shadow-[0_0_15px_rgba(255,23,68,0.15)] group-hover:shadow-[0_0_20px_rgba(255,23,68,0.3)]">
              <Image 
                src="/red-logo.png" 
                alt="Veracius Logo" 
                width={20} 
                height={20} 
                className="group-hover:scale-110 transition-transform duration-300 object-contain drop-shadow-[0_0_8px_rgba(255,23,68,0.8)]" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl font-bold tracking-wider text-foreground flex items-center gap-2">
                VERACIUS{" "}
                <span className="text-[10px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-neonRed/10 text-neonRed border border-neonRed/30">
                  AI
                </span>
              </span>
            </div>
          </Link>
          <div className="hidden xl:block">
            <SystemStatus />
          </div>
        </motion.div>

        {/* Restrained Navigation Capsule (Orchid-Inspired) */}
        <nav className="hidden md:flex items-center gap-1 bg-card/60 dark:bg-white/[0.03] backdrop-blur-xl p-1.5 rounded-full border border-border/70 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
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
                    className="absolute inset-0 rounded-full bg-secondary dark:bg-white/[0.08] border border-border dark:border-white/15 shadow-[0_0_15px_rgba(255,23,68,0.18)]"
                  />
                )}
                <span
                  className={`relative z-10 font-medium transition-colors duration-200 ${
                    isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Auth Controls, Theme Toggle & Primary CTA */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/profile"
                title={user.user_metadata?.username ? `@${user.user_metadata.username}` : user.email ?? "Profile"}
                className="h-10 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-muted-foreground hover:text-foreground border border-border hover:border-neonRed/50 hover:bg-card transition-all flex items-center gap-1.5"
              >
                <UserRound className="h-3.5 w-3.5 text-neonRed" />
                <span>PROFILE</span>
                {user.user_metadata?.username && (
                  <span className="hidden md:inline-block max-w-28 truncate text-[10px] text-neonRed font-mono font-normal">
                    @{user.user_metadata.username}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="h-10 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-muted-foreground hover:text-neonRed border border-border hover:border-neonRed/50 hover:bg-neonRed/10 transition-all flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5 text-neonRed" />
                <span className="hidden sm:inline">LOG OUT</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="h-10 px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-muted-foreground hover:text-foreground border border-border/70 hover:border-border hover:bg-card/80 transition-all flex items-center justify-center"
              >
                SIGN IN
              </Link>
              <Link
                href="/signup"
                className="h-10 px-4 rounded-full text-xs font-mono tracking-wider uppercase font-semibold text-neonRed border border-neonRed/40 hover:bg-neonRed/10 hover:border-neonRed transition-all flex items-center justify-center shadow-[0_0_12px_rgba(255,23,68,0.15)] hover:shadow-[0_0_18px_rgba(255,23,68,0.25)]"
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
                "hidden lg:flex h-10 sm:h-11 px-5 rounded-full text-xs font-mono tracking-wider uppercase font-bold bg-gradient-to-r from-neonRed to-[#D50032] hover:from-[#FF4D6D] hover:to-neonRed text-white shadow-[0_0_20px_rgba(255,23,68,0.35)] border border-neonRed-bright/40 transition-all duration-300 hover:scale-105 active:scale-95 items-center gap-2 animate-shimmer"
              )}
            >
              <span>Analyze</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </MagneticButton>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </motion.div>
      </div>

      {/* Mobile Menu Drawer (Orchid-Inspired Frosted Panel) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden border-b border-border/80 bg-background/95 backdrop-blur-2xl overflow-hidden px-6 py-6 space-y-5"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.name === "About" && pathname === "/about");
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-4 py-3 rounded-xl font-mono text-sm uppercase tracking-wider transition-colors flex items-center justify-between ${
                      isActive
                        ? "bg-card text-foreground font-bold border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    <span>{link.name}</span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-neonRed shadow-red-glow" />}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth & CTA */}
            <div className="pt-3 border-t border-border/70 space-y-3">
              {user ? (
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border font-mono text-xs uppercase tracking-wider text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-neonRed" />
                      PROFILE
                    </span>
                    {user.user_metadata?.username && (
                      <span className="text-neonRed font-normal">@{user.user_metadata.username}</span>
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-neonRed transition-colors"
                  >
                    <LogOut className="h-4 w-4 text-neonRed" />
                    <span>LOG OUT</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    className="flex items-center justify-center h-11 rounded-xl border border-border bg-card font-mono text-xs uppercase tracking-wider text-foreground font-semibold"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    href="/signup"
                    className="flex items-center justify-center h-11 rounded-xl border border-neonRed/40 bg-neonRed/10 font-mono text-xs uppercase tracking-wider text-neonRed font-semibold shadow-[0_0_12px_rgba(255,23,68,0.15)]"
                  >
                    SIGN UP
                  </Link>
                </div>
              )}

              <Link
                href="/dashboard"
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-neonRed to-[#D50032] text-white shadow-red-glow"
              >
                <span>Launch Verification Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
