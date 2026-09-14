"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, FileText, History, Activity, ShieldCheck, Command } from "lucide-react";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const actions = [
    { id: "new", label: "New Verification", icon: ShieldCheck, route: "/dashboard" },
    { id: "url", label: "Analyze URL", icon: Globe, route: "/dashboard?mode=url" },
    { id: "text", label: "Analyze Text", icon: FileText, route: "/dashboard?mode=text" },
    { id: "history", label: "Search History", icon: History, route: "/dashboard/history" },
    { id: "signals", label: "View Signals", icon: Activity, route: "/#signals" },
    { id: "how", label: "How VeraCius Works", icon: Search, route: "/about" },
  ];

  const filteredActions = query
    ? actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))
    : actions;

  const handleSelect = (route: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(route);
  };

  return (
    <>
      {/* Global Shortcut Listener (visual hint can be added to navbar later) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-background/60 backdrop-blur-sm"
            />

            {/* Palette Dialog */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed left-1/2 top-[15%] z-[101] w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-graphite-border-sec bg-graphite-surface shadow-2xl shadow-neonRed/10 font-sans"
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 border-b border-graphite-border px-4 py-4 text-foreground">
                <Command className="h-5 w-5 text-neonRed" />
                <input
                  autoFocus
                  aria-label="Search commands"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground font-mono text-sm"
                />
                <div className="flex gap-1 text-[10px] font-mono font-bold text-muted-foreground">
                  <kbd className="rounded bg-graphite-elevated px-1.5 py-0.5 border border-graphite-border">ESC</kbd>
                </div>
              </div>

              {/* Action List */}
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {filteredActions.length === 0 ? (
                  <div className="p-8 text-center text-sm font-mono text-muted-foreground">
                    No results found for "{query}"
                  </div>
                ) : (
                  filteredActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleSelect(action.route)}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-graphite-elevated hover:border-neonRed/50 hover:shadow-[0_0_15px_rgba(255,23,68,0.2)] group"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-graphite-bg border border-graphite-border group-hover:border-neonRed/50 transition-colors">
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-neonRed transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-accent transition-colors">
                          {action.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              
              {/* Footer */}
              <div className="bg-graphite-bg p-3 text-center border-t border-graphite-border">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  VeraCius Command Core
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
