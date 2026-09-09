"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Database, Network, Search, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export default function BootSequence() {
  const [mounted, setMounted] = useState(false);
  const [showBoot, setShowBoot] = useState(true);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Only run once per session
    const hasBooted = sessionStorage.getItem("veracius_booted");
    if (!hasBooted) {
      setShowBoot(true);
      sessionStorage.setItem("veracius_booted", "true");
      
      // Sequence timing
      setTimeout(() => setStage(1), 800);
      setTimeout(() => setStage(2), 1600);
      setTimeout(() => setStage(3), 2400);
      setTimeout(() => setStage(4), 3200);
      setTimeout(() => {
        setShowBoot(false);
        document.documentElement.classList.remove('is-booting');
        document.documentElement.classList.add('has-booted');
      }, 4200);
    } else {
      setShowBoot(false);
    }
  }, []);

  // Removed !mounted return null to let SSR render the sequence.
  // Using CSS and the has-booted class to instantly hide it if already booted.

  return (
    <AnimatePresence>
      {showBoot && (
        <motion.div
          id="veracius-boot-sequence"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-graphite-bg text-foreground font-mono selection:bg-neonRed/30 selection:text-neonRed-bright"
        >
          {/* Central Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-12 flex flex-col items-center gap-4"
          >
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-graphite-surface border border-graphite-border shadow-[0_0_40px_rgba(255,23,68,0.2)]">
              <Image 
                src="/red-logo.png" 
                alt="Veracius Logo" 
                width={48} 
                height={48} 
                className="drop-shadow-[0_0_10px_rgba(255,23,68,0.8)] object-contain"
              />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-3xl border border-dashed border-neonRed/30"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-foreground flex items-center gap-1">
              VERACIUS<span className="text-neonRed text-3xl leading-none">.</span>AI
            </h1>
          </motion.div>

          {/* Loading Sequence */}
          <div className="w-full max-w-sm space-y-4 px-6 text-sm">
            <BootStep 
              active={stage >= 0} 
              complete={stage >= 1} 
              icon={Database} 
              label="INITIALIZING CORE SYSTEMS" 
            />
            <BootStep 
              active={stage >= 1} 
              complete={stage >= 2} 
              icon={Search} 
              label="SOURCE ENGINE ONLINE" 
            />
            <BootStep 
              active={stage >= 2} 
              complete={stage >= 3} 
              icon={Network} 
              label="EVIDENCE ENGINE ONLINE" 
            />
            <BootStep 
              active={stage >= 3} 
              complete={stage >= 4} 
              icon={Cpu} 
              label="ANALYSIS ENGINE READY" 
            />
          </div>

          {/* Final Status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? 0 : 10 }}
            className="absolute bottom-12 flex items-center gap-2 text-neonRed font-bold tracking-widest text-xs"
          >
            <span className="h-2 w-2 rounded-full bg-neonRed animate-pulse" />
            SYSTEM READY
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BootStep({ active, complete, icon: Icon, label }: { active: boolean, complete: boolean, icon: any, label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-300 ${complete ? 'bg-neonRed/10 border-neonRed text-neonRed' : active ? 'bg-graphite-elevated border-graphite-border-sec text-muted-foreground animate-pulse' : 'border-graphite-border text-muted-foreground/30'}`}>
        {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <div className={`transition-colors duration-300 ${complete ? 'text-foreground' : active ? 'text-muted-foreground' : 'text-muted-foreground/30'}`}>
        {label}
        {active && !complete && (
          <span className="inline-flex ml-1 w-4">
            <span className="animate-[bounce_1s_infinite_0ms]">.</span>
            <span className="animate-[bounce_1s_infinite_200ms]">.</span>
            <span className="animate-[bounce_1s_infinite_400ms]">.</span>
          </span>
        )}
      </div>
    </div>
  );
}
