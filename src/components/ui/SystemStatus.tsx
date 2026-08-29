"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function SystemStatus() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "." : prev + ".");
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-graphite-border bg-graphite-bg/50 backdrop-blur-md"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-neonRed animate-pulse" />
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        SYSTEMS ONLINE<span className="inline-block w-4 text-left text-neonRed">{dots}</span>
      </span>
    </motion.div>
  );
}
