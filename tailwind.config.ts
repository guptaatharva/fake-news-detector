import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Legacy VeraCius Black + Neon Red Theme System (Mapped to standard variables)
        graphite: {
          bg: "hsl(var(--background))",
          sub: "hsl(var(--secondary))",
          surface: "hsl(var(--card))",
          elevated: "hsl(var(--card))",
          panel: "hsl(var(--card))",
          border: "hsl(var(--border))",
          "border-sec": "hsl(var(--border))",
          "border-bright": "hsl(var(--accent))",
        },
        neonRed: {
          DEFAULT: "hsl(var(--accent))",
          secondary: "hsl(var(--accent))",
          bright: "hsl(var(--accent))",
          deep: "hsl(var(--accent))",
          dark: "hsl(var(--accent))",
          label: "hsl(var(--accent))",
          mono: "hsl(var(--accent))",
        },
        verificator: {
          verified: "#34D399",
          warning: "#FBBF24",
          false: "#FF1744",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'red-glow': '0 0 30px rgba(255, 23, 68, 0.30)',
        'red-focus': '0 0 20px rgba(255, 23, 68, 0.15)',
        'card-glow': '0 0 25px rgba(255, 23, 68, 0.10)',
        'verified-glow': '0 0 35px -5px rgba(52, 211, 153, 0.25)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;


