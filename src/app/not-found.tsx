import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-transparent text-foreground flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full surface-card p-8 text-center space-y-6 border border-graphite-border bg-graphite-surface shadow-2xl">
        <div className="h-16 w-16 rounded-3xl bg-graphite-elevated border border-graphite-border flex items-center justify-center mx-auto text-neonRed shadow-red-glow">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs text-neonRed font-bold uppercase tracking-widest">
            ERROR 404 — PAGE NOT FOUND
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Unknown Route
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The requested intelligence location does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button className="h-12 w-full rounded-xl bg-gradient-to-r from-neonRed to-neonRed-deep hover:from-neonRed-bright hover:to-neonRed text-foreground font-mono text-xs font-bold uppercase tracking-wider shadow-red-glow border border-neonRed-bright/30 flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Workspace</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
