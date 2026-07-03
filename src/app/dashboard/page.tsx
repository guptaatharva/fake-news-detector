"use client";

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle, Link as LinkIcon, FileText, Loader2, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { motion } from "framer-motion";
import DashboardHero from "./DashboardHero";
import VerifyCard from "./VerifyCard";
import ReadyPanel from "./ReadyPanel";
import AgentTerminal from "./AgentTerminal";
import VerdictCard from "./VerdictCard";
import ClaimsSection from "./ClaimsSection";

interface Evidence {
  sourceUrl?: string;
  title: string;
  snippet: string;
  credibility: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface Claim {
  claimText: string;
  verdict: 'TRUE' | 'MOSTLY_TRUE' | 'MIXTURE' | 'MOSTLY_FALSE' | 'FALSE' | 'UNVERIFIABLE';
  explanation: string;
  evidence?: Evidence[];
}

interface AnalysisResult {
  verdict: 'TRUE' | 'MOSTLY_TRUE' | 'MIXTURE' | 'MOSTLY_FALSE' | 'FALSE' | 'UNVERIFIABLE';
  confidenceScore: number;
  summary: string;
  claims: Claim[];
}

export default function DashboardPage() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<'idle' | 'extracting' | 'searching' | 'synthesizing' | 'complete'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (mode: 'url' | 'text') => {
    setIsLoading(true);
    setStage('extracting');
    setError(null);
    setResult(null);
    setLogs([]);
    
    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`]);

    try {
      addLog(`Initializing analysis for ${mode}...`);
      const payload = mode === 'url' ? { url } : { text };
      
      // Stage 1: Extract Claims
      addLog("Extracting claims from content...");
      const extractResponse = await fetch('/api/analyze/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const extractData = await extractResponse.json();
      if (!extractResponse.ok) throw new Error(extractData.error || 'Failed to extract claims');

      const claims: string[] = extractData.claims.slice(0, 3);
      addLog(`Found ${claims.length} verifiable claims.`);

      // Stage 2 & 3: Search and Gather Evidence
      setStage('searching');
      let evidenceContext = '';
      
      for (let i = 0; i < claims.length; i++) {
        const claim = claims[i];
        addLog(`Searching web for claim ${i + 1}: "${claim.substring(0, 40)}..."`);
        evidenceContext += `\n--- Evidence for claim: "${claim}" ---\n`;
        
        const searchResponse = await fetch('/api/analyze/search-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claim, originalUrl: mode === 'url' ? url : undefined }),
        });
        
        const searchData = await searchResponse.json();
        if (!searchResponse.ok) throw new Error(searchData.error || 'Search failed');
        
        const results = searchData.results || [];
        addLog(`Found ${results.length} independent sources.`);
        
        for (const result of results) {
          try {
            addLog(`Scraping URL: ${new URL(result.link).hostname}...`);
            const scrapeResponse = await fetch('/api/analyze/scrape', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: result.link }),
            });
            const scrapeData = await scrapeResponse.json();
            if (scrapeResponse.ok && scrapeData.text) {
              evidenceContext += `Source URL: ${result.link}\nTitle: ${result.title}\nContent Snippet: ${scrapeData.text.substring(0, 1000)}\n\n`;
              addLog(`Successfully extracted content.`);
            } else {
              throw new Error('Scrape failed');
            }
          } catch (e) {
            evidenceContext += `Source URL: ${result.link}\nTitle: ${result.title}\nContent Snippet: ${result.snippet}\n\n`;
            addLog(`Failed full scrape. Falling back to snippet.`);
          }
        }
      }

      // Stage 4: Synthesize Verdict
      setStage('synthesizing');
      addLog("Cross-referencing claims against scraped evidence...");
      const synthesizeResponse = await fetch('/api/analyze/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalText: extractData.originalText, 
          evidenceContext: evidenceContext 
        }),
      });

      const synthesizeData = await synthesizeResponse.json();
      if (!synthesizeResponse.ok) throw new Error(synthesizeData.error || 'Failed to synthesize verdict');

      addLog("Analysis complete. Generating report.");
      setStage('complete');
      setResult(synthesizeData);
      
      // Attempt to save history (fire and forget)
      fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: mode === 'url' ? url : undefined,
          textContent: mode === 'text' ? text : undefined,
          result: synthesizeData
        }),
      }).catch(console.error);
    } catch (err: any) {
      setError(err.message);
      setStage('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'TRUE': return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800';
      case 'MOSTLY_TRUE': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800';
      case 'MIXTURE': return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800';
      case 'MOSTLY_FALSE': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800';
      case 'FALSE': return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800';
      default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'TRUE':
      case 'MOSTLY_TRUE': return <ShieldCheck className="h-8 w-8 text-emerald-600" />;
      case 'FALSE':
      case 'MOSTLY_FALSE': return <ShieldAlert className="h-8 w-8 text-rose-600" />;
      case 'MIXTURE': return <AlertTriangle className="h-8 w-8 text-amber-600" />;
      default: return <HelpCircle className="h-8 w-8 text-slate-500" />;
    }
  };

return (

<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

    <DashboardHero />

    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* Input */}

        <div className="xl:col-span-5">

            <VerifyCard
                url={url}
                text={text}
                isLoading={isLoading}
                setUrl={setUrl}
                setText={setText}
                handleAnalyze={handleAnalyze}
            />

            {error && (
                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                    {error}
                </div>
            )}

        </div>

        {/* Results */}

        <div className="xl:col-span-7 space-y-6">

            {!result && !isLoading && !error && (
                <ReadyPanel />
            )}

            {isLoading && (
                <AgentTerminal
                    stage={stage}
                    logs={logs}
                />
            )}

            {result && (
                <div className="space-y-6">

                    <VerdictCard
                        result={result}
                    />

                    <ClaimsSection
                        claims={result.claims}
                    />

                </div>
            )}

        </div>

    </div>

</div>

);
}
