import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const metadata: Metadata = {
  title: "VeriLens AI",
  description: "AI-Powered Explainable News Verification Platform",
  icons: {
  icon: "./logo.png",
  shortcut: "./logo.png",
  apple: "./logo.png",
},
  
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans")}>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
