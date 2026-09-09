"use client";

import { motion } from "framer-motion";

interface RedSweepBorderProps {
  className?: string;
  active?: boolean;
}

export default function RedSweepBorder({ className = "", active = true }: RedSweepBorderProps) {
  if (!active) return null;

  return (
    <div className={`absolute top-0 left-0 right-0 h-[1.5px] overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "linear",
          repeatDelay: 1.5,
        }}
        className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#FF1744] to-transparent opacity-80"
      />
    </div>
  );
}
