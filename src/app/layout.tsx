import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import BackgroundCanvas from "@/components/ui/BackgroundCanvas";
import PageTransition from "@/components/animation/PageTransition";
import BootSequence from "@/components/ui/BootSequence";
import CommandPalette from "@/components/navigation/CommandPalette";
import { ThemeProvider } from "@/components/ThemeProvider";
import NavbarWrapper from "@/components/navigation/NavbarWrapper";
import AuthProvider from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeraCius AI — Truth, Verified by Intelligence",
  description: "Advanced AI-Powered Information Verification & Intelligence Analysis Platform",
  icons: {
    icon: "/red-logo.png",
    shortcut: "/red-logo.png",
    apple: "/red-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        inter.variable,
        spaceGrotesk.variable,
        jetbrainsMono.variable
      )}
    >
      <body className="relative min-h-screen bg-graphite-bg text-foreground selection:bg-neonRed/30 selection:text-neonRed-bright">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider initialUser={user}>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  try {
                    if (!sessionStorage.getItem('veracius_booted')) {
                      document.documentElement.classList.add('is-booting');
                    } else {
                      document.documentElement.classList.add('has-booted');
                    }
                  } catch (e) {}
                `,
              }}
            />
            <BootSequence />
            <CommandPalette />
            <BackgroundCanvas />
            
            <div className="hide-during-boot">
              <NavbarWrapper />
            </div>

            <div className="relative z-10 hide-during-boot">
              <PageTransition>{children}</PageTransition>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
