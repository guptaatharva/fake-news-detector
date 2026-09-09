"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative w-9 h-9 rounded-full border-graphite-border bg-graphite-bg hover:bg-graphite-surface hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] hover:border-neonRed/50 hover:shadow-red-glow transition-all duration-300 group"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      title={theme === "light" ? "Dark Mode" : "Light Mode"}
      suppressHydrationWarning
    >
      <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-neonRed group-hover:text-neonRed-bright" />
      <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-neonRed group-hover:text-neonRed-bright" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
