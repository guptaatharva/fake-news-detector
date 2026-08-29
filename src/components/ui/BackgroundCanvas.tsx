"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  maxAlpha: number;
  currentAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  color: string;
  glowColor: string;
  isSpecial: boolean;
  isEmbers: boolean;
  hasTrail: boolean;
  trailHistory: { x: number; y: number }[];
  layer: "bg" | "mid" | "fg";
  seed: number;
}

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);

  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse tracking for subtle desktop repulsion & brightness boost
    let mouseX = -1000;
    let mouseY = -1000;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Check reduced motion preference
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Firefly counts as per exact user requirements
    const count = width >= 1200 ? 100 : width >= 900 ? 80 : width >= 600 ? 55 : 35;
    const fireflies: Firefly[] = [];

    const colorPalette = [
      { core: "#FF1744", glow: "rgba(255, 23, 68, 0.75)" },
      { core: "#FF2D55", glow: "rgba(255, 45, 85, 0.70)" },
      { core: "#FF4968", glow: "rgba(255, 73, 104, 0.85)" },
    ];

    // Initialize Fireflies (60% small 1-2px, 30% medium 2-3px, 10% large hero 3-4px)
    for (let i = 0; i < count; i++) {
      const isSpecial = Math.random() < 0.12; // 12% bright hero embers
      const hasTrail = Math.random() < 0.05;  // 5% particles with subtle fading trails
      const randLayer = Math.random();

      let layer: "bg" | "mid" | "fg" = "mid";
      let radius = 2.0;
      let speedMult = 0.25;
      let baseAlpha = 0.4;
      let maxAlpha = 0.75;

      if (randLayer < 0.6) {
        // 60% 1-2px
        layer = "bg";
        radius = Math.random() * 0.8 + 1.2;
        speedMult = 0.18;
        baseAlpha = Math.random() * 0.2 + 0.35;
        maxAlpha = Math.random() * 0.2 + 0.65;
      } else if (randLayer < 0.9) {
        // 30% 2-3px
        layer = "mid";
        radius = Math.random() * 1.0 + 2.0;
        speedMult = 0.3;
        baseAlpha = Math.random() * 0.2 + 0.45;
        maxAlpha = Math.random() * 0.2 + 0.85;
      } else {
        // 10% 3-4px (Hero fireflies)
        layer = "fg";
        radius = Math.random() * 1.0 + 3.0;
        speedMult = 0.4;
        baseAlpha = Math.random() * 0.2 + 0.55;
        maxAlpha = 1.0;
      }

      const colorObj = colorPalette[i % colorPalette.length];

      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speedMult,
        vy: (Math.random() - 0.5) * speedMult,
        radius,
        baseAlpha,
        maxAlpha: isSpecial ? 1.0 : maxAlpha,
        currentAlpha: baseAlpha,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.008, // 2s - 5s periods
        color: isSpecial ? "#FF4968" : colorObj.core,
        glowColor: colorObj.glow,
        isSpecial,
        isEmbers: false,
        hasTrail,
        trailHistory: [],
        layer,
        seed: Math.random() * 1000,
      });
    }

    // Add 8 dedicated slowly rising red embers
    const emberCount = 8;
    for (let e = 0; e < emberCount; e++) {
      fireflies.push({
        x: Math.random() * width,
        y: height + Math.random() * 200,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.3 + 0.2), // Slowly rising upward
        radius: Math.random() * 1.2 + 1.8,
        baseAlpha: 0.3,
        maxAlpha: 0.9,
        currentAlpha: 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015,
        color: "#FF1744",
        glowColor: "rgba(255, 23, 68, 0.8)",
        isSpecial: true,
        isEmbers: true,
        hasTrail: true,
        trailHistory: [],
        layer: "fg",
        seed: Math.random() * 1000,
      });
    }

    // Static render for reduced motion mode
    if (reducedMotion) {
      const isLight = themeRef.current === "light";
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = isLight ? "#FFFFFF" : "#030303";
      ctx.fillRect(0, 0, width, height);

      // Render fine tech grid
      ctx.strokeStyle = isLight ? "rgba(228, 228, 231, 0.6)" : "rgba(36, 16, 20, 0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render static fireflies
      fireflies.forEach((f) => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = f.baseAlpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      return;
    }

    let time = 0;

    const render = () => {
      const isLight = themeRef.current === "light";
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // 1. Base background
      ctx.fillStyle = isLight ? "#FFFFFF" : "#030303";
      ctx.fillRect(0, 0, width, height);

      // 2. Fine tech grid
      ctx.strokeStyle = isLight ? "rgba(228, 228, 231, 0.6)" : "rgba(36, 16, 20, 0.4)";
      ctx.lineWidth = 1;
      const gridSize = 50;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 3. Red atmospheric radial lighting shift
      const glowX = width * 0.5 + Math.sin(time * 0.5) * 150;
      const glowY = height * 0.35 + Math.cos(time * 0.4) * 90;

      const radialGlow = ctx.createRadialGradient(
        glowX,
        glowY,
        20,
        glowX,
        glowY,
        Math.max(width, height) * 0.6
      );
      radialGlow.addColorStop(0, isLight ? "rgba(255, 23, 68, 0.04)" : "rgba(255, 23, 68, 0.09)");
      radialGlow.addColorStop(0.5, isLight ? "rgba(255, 23, 68, 0.01)" : "rgba(201, 0, 43, 0.03)");
      radialGlow.addColorStop(1, isLight ? "rgba(255, 255, 255, 0)" : "rgba(3, 3, 3, 0)");
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // 4. Render Vivid Neon Red Fireflies & Embers
      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        if (f.isEmbers) {
          // Rising embers logic
          f.y += f.vy;
          f.x += Math.sin(time * 1.2 + f.seed) * 0.4;
          if (f.y < -30) {
            f.y = height + 40;
            f.x = Math.random() * width;
          }
        } else {
          // Organic wave motion drift
          f.vx += Math.sin(time + f.seed) * 0.005;
          f.vy += Math.cos(time * 0.8 + f.seed) * 0.005;

          const maxVel = f.layer === "fg" ? 0.55 : f.layer === "mid" ? 0.38 : 0.22;
          const velMag = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
          if (velMag > maxVel) {
            f.vx = (f.vx / velMag) * maxVel;
            f.vy = (f.vy / velMag) * maxVel;
          }

          f.x += f.vx;
          f.y += f.vy;

          if (f.x < -20) f.x = width + 20;
          if (f.x > width + 20) f.x = -20;
          if (f.y < -20) f.y = height + 20;
          if (f.y > height + 20) f.y = -20;
        }

        // Subtle desktop cursor repulsion (10-20px drift & brightness boost)
        let mouseBrightnessBoost = 0;
        if (!isTouch && mouseX > 0 && mouseY > 0) {
          const dx = f.x - mouseX;
          const dy = f.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140 && dist > 0) {
            const force = (140 - dist) / 140;
            const pushX = (dx / dist) * force * 1.2;
            const pushY = (dy / dist) * force * 1.2;
            f.x += pushX;
            f.y += pushY;
            mouseBrightnessBoost = force * 0.25;
          }
        }

        // Asynchronous twinkling phase calculation (2s to 5s periods)
        f.pulsePhase += f.pulseSpeed;
        const sineVal = (Math.sin(f.pulsePhase) + 1) / 2; // 0 to 1
        
        f.currentAlpha = Math.min(
          1.0,
          f.baseAlpha + sineVal * (f.maxAlpha - f.baseAlpha) + mouseBrightnessBoost
        );

        // Fading trail history
        if (f.hasTrail) {
          f.trailHistory.unshift({ x: f.x, y: f.y });
          if (f.trailHistory.length > 6) {
            f.trailHistory.pop();
          }

          for (let t = 1; t < f.trailHistory.length; t++) {
            const pos = f.trailHistory[t];
            const trailAlpha = f.currentAlpha * (1 - t / f.trailHistory.length) * 0.4;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, Math.max(0.5, f.radius * (1 - t * 0.12)), 0, Math.PI * 2);
            ctx.fillStyle = f.color;
            ctx.globalAlpha = Math.max(0, trailAlpha);
            ctx.fill();
          }
        }

        // Render Vivid Multi-Stop Radial Glow Aura
        const glowRadius = f.radius * 4.8;
        const glowGrad = ctx.createRadialGradient(
          f.x,
          f.y,
          0,
          f.x,
          f.y,
          glowRadius
        );
        glowGrad.addColorStop(0, f.color);
        glowGrad.addColorStop(0.25, f.glowColor);
        glowGrad.addColorStop(0.6, "rgba(255, 23, 68, 0.25)");
        glowGrad.addColorStop(1, "rgba(255, 23, 68, 0)");

        ctx.beginPath();
        ctx.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.globalAlpha = Math.min(1, f.currentAlpha * 0.85);
        ctx.fill();

        // Render Bright Firefly Core (White-red core for hero fireflies)
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
        ctx.fillStyle = f.isSpecial ? "#FFFFFF" : f.color;
        ctx.globalAlpha = f.currentAlpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-100"
    />
  );
}
