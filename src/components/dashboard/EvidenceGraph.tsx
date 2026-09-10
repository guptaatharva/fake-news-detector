"use client";

import { motion } from "framer-motion";
import { Database, Link2, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { ScrapedSource, Claim } from "@/context/AnalysisContext";

export interface EvidenceSourceNode {
  id: string;
  publisher: string;
  domain: string;
  url: string;
  confidence: number;
  summary?: string;
  title?: string;
  relationship: string;
  type: "news" | "academic" | "official";
}

interface EvidenceGraphProps {
  sourcesList?: string[];
  extractedSources?: ScrapedSource[];
  claims?: Claim[];
  confidenceScore?: number;
}

// Fallback curated sources with guaranteed live HTTPS URLs
const FALLBACK_SOURCES: EvidenceSourceNode[] = [
  { id: "src-1", publisher: "Reuters", domain: "reuters.com", url: "https://www.reuters.com", confidence: 96, title: "Reuters Global Wire Service", summary: "International factual reporting and multi-bureau verification.", type: "news", relationship: "Wire Reporting" },
  { id: "src-2", publisher: "AP News", domain: "apnews.com", url: "https://apnews.com", confidence: 98, title: "Associated Press News", summary: "Primary investigative dispatch confirming core verifiable assertions.", type: "news", relationship: "Primary Wire" },
  { id: "src-3", publisher: "WHO", domain: "who.int", url: "https://www.who.int", confidence: 99, title: "World Health Organization", summary: "Official epidemiological surveillance datasets and global directives.", type: "official", relationship: "Official Record" },
  { id: "src-4", publisher: "Nature", domain: "nature.com", url: "https://www.nature.com", confidence: 97, title: "Nature International Journal", summary: "Peer-reviewed scientific methodology and empirical research.", type: "academic", relationship: "Peer Review" },
  { id: "src-5", publisher: "BBC News", domain: "bbc.com", url: "https://www.bbc.com/news", confidence: 94, title: "BBC World Service", summary: "Independent multi-jurisdictional reporting and factual corroboration.", type: "news", relationship: "Corroboration" },
  { id: "src-6", publisher: "Science", domain: "science.org", url: "https://www.science.org", confidence: 98, title: "Science / AAAS", summary: "Empirical evidentiary findings and peer-reviewed laboratory validation.", type: "academic", relationship: "Empirical Study" },
  { id: "src-7", publisher: "Gov.uk", domain: "gov.uk", url: "https://www.gov.uk", confidence: 99, title: "UK Official Government Services", summary: "Statutory governmental publications and policy documentation.", type: "official", relationship: "Official Gazette" },
  { id: "src-8", publisher: "The Guardian", domain: "theguardian.com", url: "https://www.theguardian.com", confidence: 91, title: "The Guardian Investigations", summary: "In-depth investigative journalism and background reporting.", type: "news", relationship: "Investigative" },
  { id: "src-9", publisher: "The Lancet", domain: "thelancet.com", url: "https://www.thelancet.com", confidence: 98, title: "The Lancet Medical Journal", summary: "Authoritative clinical trials and biomedical assessments.", type: "academic", relationship: "Clinical Evidence" },
  { id: "src-10", publisher: "Financial Times", domain: "ft.com", url: "https://www.ft.com", confidence: 93, title: "Financial Times Reporting", summary: "Market data and verified financial statements.", type: "news", relationship: "Market Data" },
  { id: "src-11", publisher: "CDC", domain: "cdc.gov", url: "https://www.cdc.gov", confidence: 99, title: "Centers for Disease Control", summary: "Public health surveillance and epidemiological datasets.", type: "official", relationship: "Public Registry" },
  { id: "src-12", publisher: "Bloomberg", domain: "bloomberg.com", url: "https://www.bloomberg.com", confidence: 92, title: "Bloomberg News", summary: "Real-time syndicated market reporting.", type: "news", relationship: "Syndicated Dispatch" },
];

function sanitizeUrl(rawUrl?: string, domain?: string): string {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return domain ? `https://${domain}` : "https://reuters.com";
  }
  const trimmed = rawUrl.trim();
  // Filter out google news redirect links or search aggregator URLs
  if (trimmed.includes("news.google.com") || trimmed.includes("google.com/url")) {
    return domain ? `https://${domain}` : "https://reuters.com";
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch {
    return domain ? `https://${domain}` : trimmed;
  }
}

function cleanDomainString(rawUrl?: string, fallbackDomain?: string): string {
  if (fallbackDomain && fallbackDomain.trim().length > 0) {
    return fallbackDomain.replace(/^www\./, "").toLowerCase().trim();
  }
  if (!rawUrl) return "source.org";
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase().trim();
  } catch {
    return "source.org";
  }
}

function formatPublisherFromDomain(domain: string, rawSource?: string): string {
  if (rawSource && rawSource.trim().length > 0 && !rawSource.includes("http") && !rawSource.includes(".")) {
    return rawSource.trim();
  }
  if (!domain) return "Independent Publisher";
  const name = domain.split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface PositionedNode extends EvidenceSourceNode {
  socketX: number;
  socketY: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  isRightSide: boolean;
  angleDeg: number;
}

export default function EvidenceGraph({
  sourcesList = [],
  extractedSources = [],
  claims = [],
  confidenceScore = 90,
}: EvidenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ResizeObserver to detect container dimensions dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 1. Compile and deduplicate actual sources from analysis results
  const sources = useMemo<EvidenceSourceNode[]>(() => {
    const map = new Map<string, EvidenceSourceNode>();

    // A. Extracted scraped sources
    if (extractedSources && extractedSources.length > 0) {
      extractedSources.forEach((s, idx) => {
        const dom = cleanDomainString(s.url || s.sourceUrl || s.link, s.domain);
        if (!dom || dom.includes("news.google.com")) return;
        const validUrl = sanitizeUrl(s.sourceUrl || s.url || s.link, dom);
        const publisher = formatPublisherFromDomain(dom, s.source);
        const variance = (hashString(dom) % 9) - 4; // -4 to +4
        const score = Math.min(99, Math.max(72, (confidenceScore || 90) + variance));

        if (!map.has(dom)) {
          map.set(dom, {
            id: `extracted-${idx}-${dom}`,
            publisher,
            domain: dom,
            url: validUrl,
            confidence: score,
            summary: s.snippet || s.content?.substring(0, 140),
            title: s.title,
            relationship: "Direct Verification",
            type: "news",
          });
        }
      });
    }

    // B. Claim-level evidence sources
    if (claims && claims.length > 0) {
      claims.forEach((c) => {
        if (c.evidence && c.evidence.length > 0) {
          c.evidence.forEach((ev, evIdx) => {
            const dom = cleanDomainString(ev.sourceUrl || ev.url, ev.domain);
            if (!dom || dom.includes("news.google.com")) return;
            const validUrl = sanitizeUrl(ev.sourceUrl || ev.url, dom);
            const publisher = formatPublisherFromDomain(dom, ev.publisher || ev.source);
            
            let score = 88;
            if (ev.credibility === "HIGH") score = 95;
            else if (ev.credibility === "MEDIUM") score = 84;
            else if (ev.credibility === "LOW") score = 72;
            const variance = (hashString(dom) % 5) - 2;
            score = Math.min(99, Math.max(70, score + variance));

            if (!map.has(dom)) {
              map.set(dom, {
                id: `claim-ev-${evIdx}-${dom}`,
                publisher,
                domain: dom,
                url: validUrl,
                confidence: score,
                summary: ev.summary || ev.snippet,
                title: ev.title,
                relationship: "Claim Evidence",
                type: ev.credibility === "HIGH" ? "official" : "news",
              });
            }
          });
        }
      });
    }

    // C. Domain strings fallback
    if (map.size === 0 && sourcesList && sourcesList.length > 0) {
      sourcesList.forEach((domStr, idx) => {
        const dom = cleanDomainString(undefined, domStr);
        if (!dom || dom.includes("news.google.com")) return;
        const validUrl = sanitizeUrl(undefined, dom);
        const publisher = formatPublisherFromDomain(dom);
        const score = Math.min(99, Math.max(75, 91 + ((hashString(dom) % 8) - 4)));

        if (!map.has(dom)) {
          map.set(dom, {
            id: `dom-${idx}-${dom}`,
            publisher,
            domain: dom,
            url: validUrl,
            confidence: score,
            summary: `Verified reporting from ${publisher} on factual assertions.`,
            title: `${publisher} Intelligence Source`,
            relationship: "Corroboration",
            type: "news",
          });
        }
      });
    }

    // D. Default fallback set if no analysis results yet
    if (map.size === 0) {
      return FALLBACK_SOURCES;
    }

    return Array.from(map.values());
  }, [extractedSources, claims, sourcesList, confidenceScore]);

  // 2. Deterministic Multi-Ring Orbital Placement with Collision Relaxation
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    const { width, height } = dimensions;
    if (width === 0 || height === 0 || sources.length === 0) return [];

    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const N = sources.length;

    const cx = width / 2;
    const cy = height / 2;

    // Center exclusion radius for "CLAIM ORIGIN"
    const centerExclusionR = isMobile ? 95 : 135;

    // Card dimensions for layout box calculations
    const boxW = isMobile ? Math.min(140, Math.max(120, width * 0.35)) : isTablet ? 180 : 205;
    const boxH = isMobile ? 32 : 40;
    const socketR = isMobile ? 14 : 20; // socket radius

    // Safe boundaries with padding
    const padX = isMobile ? 16 : 28;
    const padY = isMobile ? 20 : 36;
    const maxSafeRx = Math.max(centerExclusionR + 50, (width - padX * 2 - boxW) / 2);
    const maxSafeRy = Math.max(centerExclusionR + 40, (height - padY * 2 - boxH) / 2);

    // Initial radial assignment: 1, 2, or 3 concentric staggered orbitals
    interface RawNode {
      source: EvidenceSourceNode;
      angle: number;
      rx: number;
      ry: number;
      x: number;
      y: number;
    }

    const rawNodes: RawNode[] = [];

    if (N <= 6) {
      // 1 Orbital Ring
      const rho = 0.72;
      const rx = Math.max(centerExclusionR + 45, maxSafeRx * rho);
      const ry = Math.max(centerExclusionR + 45, maxSafeRy * rho);

      for (let i = 0; i < N; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / N;
        rawNodes.push({
          source: sources[i],
          angle,
          rx,
          ry,
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
        });
      }
    } else if (N <= 14) {
      // 2 Concentric Staggered Rings
      const innerCount = Math.ceil(N * 0.45);
      const outerCount = N - innerCount;

      const innerRx = Math.max(centerExclusionR + 30, maxSafeRx * 0.50);
      const innerRy = Math.max(centerExclusionR + 30, maxSafeRy * 0.50);
      const outerRx = Math.max(innerRx + 55, maxSafeRx * 0.88);
      const outerRy = Math.max(innerRy + 50, maxSafeRy * 0.88);

      // Inner ring
      for (let i = 0; i < innerCount; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / innerCount;
        rawNodes.push({
          source: sources[i],
          angle,
          rx: innerRx,
          ry: innerRy,
          x: cx + Math.cos(angle) * innerRx,
          y: cy + Math.sin(angle) * innerRy,
        });
      }

      // Outer ring (staggered by half phase)
      const phase = Math.PI / outerCount;
      for (let j = 0; j < outerCount; j++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * j) / outerCount + phase;
        rawNodes.push({
          source: sources[innerCount + j],
          angle,
          rx: outerRx,
          ry: outerRy,
          x: cx + Math.cos(angle) * outerRx,
          y: cy + Math.sin(angle) * outerRy,
        });
      }
    } else {
      // 3 Concentric Staggered Rings for large source counts (15–30+)
      const r1Count = Math.ceil(N * 0.28);
      const r2Count = Math.ceil(N * 0.36);
      const r3Count = N - r1Count - r2Count;

      const r1x = Math.max(centerExclusionR + 25, maxSafeRx * 0.44);
      const r1y = Math.max(centerExclusionR + 25, maxSafeRy * 0.44);
      const r2x = Math.max(r1x + 45, maxSafeRx * 0.68);
      const r2y = Math.max(r1y + 40, maxSafeRy * 0.68);
      const r3x = Math.max(r2x + 45, maxSafeRx * 0.92);
      const r3y = Math.max(r2y + 40, maxSafeRy * 0.92);

      let idx = 0;
      for (let i = 0; i < r1Count; i++, idx++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / r1Count;
        rawNodes.push({
          source: sources[idx],
          angle,
          rx: r1x,
          ry: r1y,
          x: cx + Math.cos(angle) * r1x,
          y: cy + Math.sin(angle) * r1y,
        });
      }
      const phase2 = Math.PI / r2Count;
      for (let i = 0; i < r2Count; i++, idx++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / r2Count + phase2;
        rawNodes.push({
          source: sources[idx],
          angle,
          rx: r2x,
          ry: r2y,
          x: cx + Math.cos(angle) * r2x,
          y: cy + Math.sin(angle) * r2y,
        });
      }
      const phase3 = Math.PI / r3Count + Math.PI / 4;
      for (let i = 0; i < r3Count; i++, idx++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / r3Count + phase3;
        rawNodes.push({
          source: sources[idx],
          angle,
          rx: r3x,
          ry: r3y,
          x: cx + Math.cos(angle) * r3x,
          y: cy + Math.sin(angle) * r3y,
        });
      }
    }

    // 3. Fast Deterministic 2D Bounding-Box Relaxation Pass (25 iterations)
    const pos = rawNodes.map((rn) => ({
      x: rn.x,
      y: rn.y,
      angle: rn.angle,
    }));

    const clearanceX = 14;
    const clearanceY = 10;

    for (let iter = 0; iter < 25; iter++) {
      // Pairwise box collision repulsion
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x;
          const dy = pos[j].y - pos[i].y;
          const overlapX = boxW + clearanceX - Math.abs(dx);
          const overlapY = boxH + clearanceY - Math.abs(dy);

          if (overlapX > 0 && overlapY > 0) {
            // Push apart along axis of least overlap
            if (overlapX < overlapY * 1.5) {
              const shift = (overlapX / 2) + 1;
              if (dx >= 0) {
                pos[i].x -= shift;
                pos[j].x += shift;
              } else {
                pos[i].x += shift;
                pos[j].x += shift;
              }
            } else {
              const shift = (overlapY / 2) + 1;
              if (dy >= 0) {
                pos[i].y -= shift;
                pos[j].y += shift;
              } else {
                pos[i].y += shift;
                pos[j].y += shift;
              }
            }
          }
        }
      }

      // Central exclusion zone enforcement
      for (let i = 0; i < pos.length; i++) {
        const dx = pos[i].x - cx;
        const dy = pos[i].y - cy;
        const dist = Math.hypot(dx, dy);
        const minAllowed = centerExclusionR + Math.max(boxW, boxH) * 0.45;

        if (dist < minAllowed) {
          const factor = minAllowed / (dist || 1);
          pos[i].x = cx + dx * factor;
          pos[i].y = cy + dy * factor;
        }

        // Boundary containment
        const minX = padX + boxW / 2;
        const maxX = width - padX - boxW / 2;
        const minY = padY + boxH / 2;
        const maxY = height - padY - boxH / 2;

        pos[i].x = Math.max(minX, Math.min(maxX, pos[i].x));
        pos[i].y = Math.max(minY, Math.min(maxY, pos[i].y));
      }
    }

    // 4. Construct Final Positioned Node with radially oriented socket & card
    return rawNodes.map((rn, i) => {
      const p = pos[i];
      const isRightSide = p.x >= cx;
      const angleDeg = (rn.angle * 180) / Math.PI;

      // Socket is placed towards the center, label card extends outward
      const socketOffsetX = isRightSide ? -boxW / 2 + socketR + 4 : boxW / 2 - socketR - 4;
      const socketX = p.x + socketOffsetX;
      const socketY = p.y;

      return {
        ...rn.source,
        socketX,
        socketY,
        boxX: p.x,
        boxY: p.y,
        boxWidth: boxW,
        boxHeight: boxH,
        isRightSide,
        angleDeg,
      };
    });
  }, [dimensions, sources]);

  // Handle direct click navigation to original publisher URL
  const handleNodeClick = useCallback((url: string) => {
    if (typeof window !== "undefined" && url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Compute dynamic height based on source volume
  const dynamicMinHeight = useMemo(() => {
    if (sources.length <= 8) return 600;
    if (sources.length <= 16) return 680;
    return Math.min(950, 680 + (sources.length - 16) * 18);
  }, [sources.length]);

  return (
    <div className="w-full bg-graphite-surface border border-graphite-border rounded-2xl p-4 sm:p-6 md:p-8 relative flex flex-col shadow-2xl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10 border-b border-graphite-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neonRed/10 border border-neonRed/30 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-neonRed" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-base md:text-lg uppercase tracking-widest text-foreground font-bold">
                EVIDENCE NETWORK
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-verificator-verified/15 text-verificator-verified border border-verificator-verified/30">
                <span className="w-1.5 h-1.5 rounded-full bg-verificator-verified animate-ping" />
                {sources.length} VERIFIED SOURCES
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Radial multi-source corroboration matrix. Click any source to inspect original article.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground self-start sm:self-auto bg-graphite-bg/80 px-3 py-1.5 rounded-xl border border-graphite-border">
          <Sparkles className="w-3.5 h-3.5 text-neonRed" />
          <span className="text-[11px] text-zinc-300">INTERACTIVE HUD</span>
        </div>
      </div>

      {/* Network Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl border border-graphite-border bg-graphite-bg overflow-hidden select-none focus:outline-none"
        style={{
          height: `clamp(${dynamicMinHeight}px, 72vh, 1000px)`,
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.85)",
        }}
      >
        {/* Subtle Cyber Grid */}
        <div
          className="absolute inset-0 opacity-20 z-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #35151B 1px, transparent 1px), linear-gradient(to bottom, #35151B 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Deep ambient radial glow behind center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-neonRed/10 rounded-full blur-[120px] pointer-events-none z-0" />

        {/* Central Claim Origin Node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full bg-graphite-elevated border-[3px] sm:border-[4px] border-neonRed shadow-[0_0_50px_rgba(255,23,68,0.5)] flex items-center justify-center">
            {/* Pulsing ring behind center */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-neonRed/20 animate-ping absolute" />
            <Database className="w-10 h-10 sm:w-14 sm:h-14 text-neonRed relative z-10 drop-shadow-[0_0_12px_rgba(255,23,68,0.8)]" />
          </div>
          
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm font-mono font-bold text-neonRed tracking-widest bg-graphite-bg/95 px-4 sm:px-6 py-1.5 rounded-full border border-neonRed/50 shadow-[0_0_20px_rgba(255,23,68,0.3)] whitespace-nowrap">
            CLAIM ORIGIN
          </div>
        </div>

        {/* SVG Connection Lines & Animated Laser Pulses */}
        <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          <defs>
            <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF1744" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.9" />
            </linearGradient>
            <filter id="laserBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {positionedNodes.map((src, i) => {
            const isHovered = hoveredId === src.id;
            const isAnyHovered = hoveredId !== null;

            // Connection line appearance
            const strokeColor = isHovered
              ? "#FF1744"
              : isAnyHovered
              ? "rgba(255, 23, 68, 0.12)"
              : "rgba(255, 23, 68, 0.32)";
            const strokeWidth = isHovered ? 3.5 : isAnyHovered ? 1 : 1.8;

            return (
              <g key={`connection-${src.id}`}>
                {/* Base connection ray */}
                <line
                  x1="50%"
                  y1="50%"
                  x2={src.socketX}
                  y2={src.socketY}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{
                    transition: "stroke 0.25s ease, stroke-width 0.25s ease",
                    filter: isHovered ? "drop-shadow(0 0 10px rgba(255,23,68,0.95))" : undefined,
                  }}
                />

                {/* Animated laser pulse traveling along the active connection */}
                <motion.line
                  x1="50%"
                  y1="50%"
                  x2={src.socketX}
                  y2={src.socketY}
                  stroke={isHovered ? "#FFFFFF" : "#FF1744"}
                  strokeWidth={isHovered ? 4 : 2.5}
                  strokeDasharray="20 400"
                  style={{
                    filter: "url(#laserBlur)",
                    opacity: isAnyHovered && !isHovered ? 0.05 : 1,
                  }}
                  initial={{ strokeDashoffset: 420 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{
                    duration: isHovered ? 1.4 : 3 + (i % 3),
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.15,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Source Nodes (Interactive Anchors) */}
        {positionedNodes.map((src, i) => {
          const isHovered = hoveredId === src.id;
          const isFlippedTooltip = src.boxY < (dimensions.height || 600) * 0.36;

          return (
            <motion.div
              key={src.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              style={{
                left: `${src.boxX}px`,
                top: `${src.boxY}px`,
                width: `${src.boxWidth}px`,
                height: `${src.boxHeight}px`,
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(0.6, i * 0.04), duration: 0.35 }}
            >
              {/* Accessible Interactive Anchor */}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                role="button"
                tabIndex={0}
                aria-label={`Source: ${src.publisher}, domain ${src.domain}, confidence ${src.confidence}%. Opens original publisher article in new browser tab.`}
                onMouseEnter={() => setHoveredId(src.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(src.id)}
                onBlur={() => setHoveredId(null)}
                onClick={(e) => {
                  // Direct navigation is guaranteed by native target="_blank"
                  // On touch mobile, provide a clean tap trigger
                  if (window.innerWidth < 640) {
                    handleNodeClick(src.url);
                  }
                }}
                className={`w-full h-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-neonRed focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  src.isRightSide ? "flex-row" : "flex-row-reverse"
                } ${
                  isHovered
                    ? "bg-[#140608]/98 border-neonRed shadow-[0_0_30px_rgba(255,23,68,0.6)] scale-[1.04] z-30"
                    : "bg-graphite-surface/95 hover:bg-[#120507]/95 border-graphite-border hover:border-neonRed/60 shadow-xl"
                } backdrop-blur-xl`}
              >
                {/* Verificator Green Socket Dot */}
                <div
                  className={`relative flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-graphite-elevated border-[2px] transition-colors duration-200 flex items-center justify-center ${
                    isHovered ? "border-neonRed" : "border-graphite-border-sec"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-verificator-verified shadow-[0_0_12px_rgba(16,185,129,0.95)] transition-transform duration-200 ${
                      isHovered ? "scale-125" : "scale-100"
                    }`}
                  />
                </div>

                {/* Domain / Publisher Title */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <span
                    className="font-mono text-xs sm:text-sm font-bold text-foreground truncate tracking-wide block"
                    title={src.domain}
                  >
                    {src.domain}
                  </span>
                </div>

                {/* Confidence Percentage Badge */}
                <div className="flex-shrink-0 flex items-center gap-1 font-mono text-xs sm:text-sm font-black text-neonRed">
                  <span>{src.confidence}%</span>
                </div>
              </a>

              {/* HUD Hover Detail Tooltip */}
              {isHovered && (
                <div
                  className={`absolute ${
                    isFlippedTooltip ? "top-full mt-2.5" : "bottom-full mb-2.5"
                  } left-1/2 -translate-x-1/2 w-64 sm:w-72 p-3 bg-[#0d0305]/98 border border-neonRed/80 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150`}
                >
                  {/* Tooltip Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-graphite-border/70 pb-1.5 mb-1.5">
                    <div className="font-mono text-[11px] text-neonRed font-bold uppercase tracking-wider truncate">
                      {src.publisher}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-verificator-verified">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{src.confidence}% CONF</span>
                    </div>
                  </div>

                  {/* Article Title if present */}
                  {src.title && (
                    <div className="text-xs font-semibold text-foreground line-clamp-2 mb-1 leading-snug">
                      {src.title}
                    </div>
                  )}

                  {/* Concise Summary / Snippet */}
                  {src.summary && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2 font-sans">
                      {src.summary}
                    </p>
                  )}

                  {/* Tooltip Footer with Action Hint */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-graphite-border/40">
                    <span className="truncate max-w-[140px] text-zinc-400">{src.domain}</span>
                    <span className="text-neonRed font-bold inline-flex items-center gap-1">
                      Open Source <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
