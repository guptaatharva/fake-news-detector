"use client";

import { motion } from "framer-motion";
import { Database, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SourceNode {
  id: string;
  name: string;
  type: "news" | "academic" | "official";
  angle: number;
  distance: number;
  score: number;
}

export default function EvidenceGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const sources: SourceNode[] = [
    { id: "1", name: "Reuters", type: "news", angle: 15, distance: 0.9, score: 95 },
    { id: "2", name: "AP News", type: "news", angle: 45, distance: 0.7, score: 98 },
    { id: "3", name: "WHO.int", type: "official", angle: 75, distance: 1.0, score: 99 },
    { id: "4", name: "Nature.com", type: "academic", angle: 105, distance: 0.8, score: 96 },
    { id: "5", name: "BBC News", type: "news", angle: 135, distance: 0.95, score: 92 },
    { id: "6", name: "Science", type: "academic", angle: 165, distance: 0.75, score: 97 },
    { id: "7", name: "Gov.uk", type: "official", angle: 195, distance: 1.0, score: 99 },
    { id: "8", name: "Al Jazeera", type: "news", angle: 225, distance: 0.85, score: 89 },
    { id: "9", name: "The Lancet", type: "academic", angle: 255, distance: 0.9, score: 98 },
    { id: "10", name: "NY Times", type: "news", angle: 285, distance: 0.7, score: 94 },
    { id: "11", name: "JAMA", type: "academic", angle: 315, distance: 0.88, score: 96 },
    { id: "12", name: "CDC.gov", type: "official", angle: 345, distance: 0.95, score: 99 },
  ];

  const getCalculatedPosition = (angleDeg: number, distance: number) => {
    if (dimensions.width === 0 || dimensions.height === 0) {
      return { left: "50%", top: "50%" };
    }

    const angleRad = (angleDeg * Math.PI) / 180;
    const isMobile = dimensions.width < 640;
    
    // Generous padding so the much larger labels and nodes never get cut off
    const paddingX = isMobile ? 100 : 200; 
    const paddingY = isMobile ? 100 : 120;
    
    const safeWidth = Math.max(0, dimensions.width - paddingX * 2);
    const safeHeight = Math.max(0, dimensions.height - paddingY * 2);
    
    const px = Math.cos(angleRad) * (safeWidth / 2) * distance;
    const py = Math.sin(angleRad) * (safeHeight / 2) * distance;
    
    const leftPct = 50 + (px / dimensions.width) * 100;
    const topPct = 50 + (py / dimensions.height) * 100;

    return { left: `${leftPct}%`, top: `${topPct}%` };
  };

  const getLabelPositionClass = (angleDeg: number, width: number) => {
    const isMobile = width < 640;
    const normalized = ((angleDeg % 360) + 360) % 360;
    
    if (isMobile) {
      // Force labels above/below on mobile to preserve horizontal space
      if (normalized > 0 && normalized <= 180) {
        return "mt-3 top-full left-1/2 -translate-x-1/2";
      } else {
        return "mb-3 bottom-full left-1/2 -translate-x-1/2";
      }
    }

    // Smart placement on desktop
    if (normalized > 45 && normalized <= 135) {
      return "mt-4 top-full left-1/2 -translate-x-1/2";
    } else if (normalized > 135 && normalized <= 225) {
      return "mr-4 right-full top-1/2 -translate-y-1/2";
    } else if (normalized > 225 && normalized <= 315) {
      return "mb-4 bottom-full left-1/2 -translate-x-1/2";
    } else {
      return "ml-4 left-full top-1/2 -translate-y-1/2";
    }
  };

  const positionedSources = sources.map((src) => ({
    ...src,
    ...getCalculatedPosition(src.angle, src.distance),
    labelClass: getLabelPositionClass(src.angle, dimensions.width),
  }));

  // Create an array of fireflies for the background
  const fireflies = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 2,
  }));

  return (
    <div className="w-full bg-graphite-surface border border-graphite-border rounded-2xl p-6 md:p-8 relative flex flex-col shadow-2xl">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <Link2 className="w-6 h-6 text-neonRed" />
        <h3 className="font-mono text-base md:text-lg uppercase tracking-widest text-foreground font-bold">
          EVIDENCE NETWORK
        </h3>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full h-[70vh] min-h-[600px] max-h-[1000px] overflow-hidden rounded-xl border border-graphite-border bg-graphite-bg"
        style={{
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.8)"
        }}
      >
        {/* Fireflies background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {fireflies.map((ff) => (
            <motion.div
              key={ff.id}
              className="absolute w-1 h-1 rounded-full bg-neonRed/40 blur-[1px]"
              style={{ top: ff.top, left: ff.left }}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0, 0.8, 0],
                scale: [1, 1.5, 1]
              }}
              transition={{
                duration: ff.duration,
                repeat: Infinity,
                delay: ff.delay,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-20 z-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #35151B 1px, transparent 1px), linear-gradient(to bottom, #35151B 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Deep radial glow behind center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neonRed/5 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* Central Claim Node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-graphite-elevated border-[4px] border-neonRed shadow-[0_0_60px_rgba(255,23,68,0.5)] flex items-center justify-center z-20">
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full bg-neonRed/20 animate-ping absolute" />
          <Database className="w-12 h-12 sm:w-16 sm:h-16 text-neonRed relative z-10" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-24 sm:mt-32 text-sm sm:text-base font-mono font-bold text-neonRed tracking-widest z-20 bg-graphite-bg/90 px-6 py-2 rounded-full border border-neonRed/50 shadow-[0_0_20px_rgba(255,23,68,0.3)] whitespace-nowrap">
          CLAIM ORIGIN
        </div>

        {/* Source Nodes & Connections */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          {positionedSources.map((src, i) => (
            <g key={`connection-${src.id}`}>
              {/* Base line */}
              <motion.line
                x1="50%"
                y1="50%"
                x2={src.left}
                y2={src.top}
                stroke="rgba(255,23,68,0.3)"
                strokeWidth="2"
              />
              {/* Animated glowing pulse travelling along the line */}
              <motion.line
                x1="50%"
                y1="50%"
                x2={src.left}
                y2={src.top}
                stroke="rgba(255,23,68,1)"
                strokeWidth="4"
                strokeDasharray="20 1000"
                style={{ filter: "drop-shadow(0 0 8px rgba(255,23,68,0.8))" }}
                initial={{ strokeDashoffset: 1000 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: "linear", delay: i * 0.2 }}
              />
            </g>
          ))}
        </svg>

        {positionedSources.map((src, i) => (
          <motion.div
            key={src.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
            style={{ left: src.left, top: src.top }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: dimensions.width > 0 ? 1 : 0, scale: dimensions.width > 0 ? 1 : 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-graphite-elevated border-[3px] border-graphite-border-sec flex items-center justify-center group-hover:border-neonRed group-hover:shadow-[0_0_30px_rgba(255,23,68,0.5)] transition-all duration-300 z-10 relative">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-verificator-verified shadow-[0_0_15px_rgba(16,185,129,0.9)] group-hover:scale-110 transition-transform" />
              </div>
              {/* Node Label */}
              <div className={`absolute ${src.labelClass} bg-graphite-surface/95 backdrop-blur-xl border border-graphite-border px-4 py-2 rounded-xl text-sm sm:text-base font-mono whitespace-nowrap group-hover:border-neonRed/60 transition-colors shadow-2xl z-20 pointer-events-none`}>
                <span className="text-foreground font-bold tracking-wide">{src.name}</span>
                <span className="text-neonRed ml-4 font-black">{src.score}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
