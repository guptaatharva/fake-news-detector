import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, AlertTriangle, Link as LinkIcon, FileText } from 'lucide-react';
import Link from 'next/link';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default async function HistoryPage() {
  const session = await auth();
  
  if (!session || !session.user?.id) {
    redirect('/api/auth/signin');
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { claims: true },
  });

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'TRUE':
      case 'MOSTLY_TRUE': return <ShieldCheck className="h-5 w-5 text-emerald-600" />;
      case 'FALSE':
      case 'MOSTLY_FALSE': return <ShieldAlert className="h-5 w-5 text-rose-600" />;
      case 'MIXTURE': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-slate-500" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'TRUE': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400';
      case 'MOSTLY_TRUE': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400';
      case 'MIXTURE': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400';
      case 'MOSTLY_FALSE': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400';
      case 'FALSE': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analysis History</h1>
        <p className="text-muted-foreground">View your past verifications and fact-checks.</p>
      </div>

      {analyses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
          <p className="text-muted-foreground">You haven't run any analyses yet.</p>
          <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 font-medium">Go analyze something</Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow dark:bg-slate-900">
              <CardHeader className="pb-3 flex flex-row justify-between items-start">
                <div className="flex items-center gap-2">
                  {getVerdictIcon(analysis.verdict)}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getVerdictColor(analysis.verdict)}`}>
                    {analysis.verdict.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </span>
              </CardHeader>
              <CardContent>
                {analysis.sourceUrl ? (
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-2 truncate text-slate-800 dark:text-slate-200">
                    <LinkIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">{analysis.sourceUrl}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-2 truncate text-slate-600 dark:text-slate-400">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span>Text Snippet</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                  {analysis.summary}
                </p>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {analysis.claims.length} claims analyzed
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
