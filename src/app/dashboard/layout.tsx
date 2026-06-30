import Link from 'next/link';
import { ShieldCheck, LogOut, History, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-white dark:bg-slate-950/80 backdrop-blur-md px-6 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">VeriLens AI</span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-8 px-3 gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Analyze</span>
          </Link>
          <Link href="/dashboard/history" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-8 px-3 gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Link>
          {/* Implement real auth later */}
          <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-8 px-3 gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 border-rose-200 dark:border-rose-900 ml-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-12">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
