"use client";

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle, Link as LinkIcon, FileText, Loader2, AlertTriangle, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Analysis Workspace</h1>
        <p className="text-muted-foreground text-lg">Verify news articles, claims, or social media posts using AI.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Input Section */}
        <Card className="xl:col-span-5 shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-fit">
          <CardHeader>
            <CardTitle className="text-xl">Submit Content</CardTitle>
            <CardDescription>Enter a URL or paste text to begin verification.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="url" className="gap-2"><LinkIcon className="h-4 w-4" /> URL</TabsTrigger>
                <TabsTrigger value="text" className="gap-2"><FileText className="h-4 w-4" /> Text</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Input 
                    placeholder="https://example.com/news/article" 
                    type="url" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                    className="focus-visible:ring-blue-600"
                  />
                  <p className="text-xs text-muted-foreground">Supported: News articles, blogs, factual web pages.</p>
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                  onClick={() => handleAnalyze('url')}
                  disabled={!url || isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                  Analyze URL
                </Button>
              </TabsContent>
              <TabsContent value="text" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Textarea 
                    placeholder="Paste the claim or article text here (min 50 characters)..." 
                    className="min-h-[200px] resize-none focus-visible:ring-blue-600"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                  onClick={() => handleAnalyze('text')}
                  disabled={!text || isLoading || text.length < 50}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
                  Analyze Text
                </Button>
              </TabsContent>
            </Tabs>
            
            {error && (
              <div className="mt-6 p-4 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-start gap-3 animate-in fade-in">
                <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="xl:col-span-7 space-y-6">
          {!result && !isLoading && !error && (
            <Card className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 border-dashed shadow-none bg-slate-50/50 dark:bg-slate-900/50 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 rounded-full flex items-center justify-center mb-4 ring-8 ring-blue-50 dark:ring-blue-950">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Verify</h3>
              <p className="text-muted-foreground max-w-md">Our AI engine will analyze the content against trusted sources, break down specific claims, and provide a detailed veracity report.</p>
            </Card>
          )}

          {isLoading && (
            <Card className="h-full min-h-[400px] flex flex-col p-8 shadow-sm border-slate-200 bg-white dark:bg-slate-900">
              <div className="flex flex-col items-center justify-center mb-6 mt-2">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <h3 className="text-xl font-medium animate-pulse text-slate-800 dark:text-slate-200">
                  {stage === 'extracting' && 'Extracting core claims from content...'}
                  {stage === 'searching' && 'Scraping the live web for evidence...'}
                  {stage === 'synthesizing' && 'Synthesizing final verdict...'}
                </h3>
                <div className="w-64 mt-6">
                  <Progress value={stage === 'extracting' ? 33 : stage === 'searching' ? 66 : 90} className="h-2" />
                </div>
              </div>
              
              <div className="flex-1 w-full bg-slate-950 rounded-lg p-5 font-mono text-[13px] leading-relaxed overflow-y-auto border border-slate-800 shadow-inner flex flex-col justify-end max-h-[300px]">
                <div className="space-y-2 mt-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="text-emerald-400 opacity-90 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <span className="text-slate-600 mr-3">{'>'}</span>{log}
                    </div>
                  ))}
                  <div className="text-emerald-400 animate-pulse mt-2"><span className="text-slate-600 mr-3">{'>'}</span>_</div>
                </div>
              </div>
            </Card>
          )}

          {result && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
              {/* Overall Verdict Card */}
              <Card className="overflow-hidden shadow-md border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className={`p-6 border-b ${getVerdictColor(result.verdict)} flex items-center justify-between`}>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/60 dark:bg-black/20 rounded-full backdrop-blur-sm">
                      {getVerdictIcon(result.verdict)}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Overall Verdict</p>
                      <h2 className="text-3xl font-extrabold">{result.verdict.replace('_', ' ')}</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Confidence</p>
                    <div className="text-4xl font-black flex items-baseline justify-end gap-0.5 font-mono">
                      {result.confidenceScore}<span className="text-xl font-bold opacity-75">%</span>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Summary Analysis
                  </h3>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-lg">{result.summary}</p>
                </CardContent>
              </Card>

              {/* Claims Breakdown */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Claims Breakdown
                </h3>
                {result.claims.map((claim, idx) => (
                  <Card key={idx} className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 transition-all hover:shadow-md">
                    <div className="p-5 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-bold border ${getVerdictColor(claim.verdict)} self-start`}>
                          {claim.verdict.replace('_', ' ')}
                        </div>
                        <div className="space-y-2 flex-1">
                          <h4 className="font-semibold text-lg leading-snug text-slate-900 dark:text-slate-100">{claim.claimText}</h4>
                          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{claim.explanation}</p>
                        </div>
                      </div>
                      
                      {claim.evidence && claim.evidence.length > 0 && (
                        <div className="mt-5 sm:ml-[110px] pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <LinkIcon className="h-3 w-3" />
                            Sources & Evidence
                          </p>
                          {claim.evidence.map((ev, eIdx) => (
                            <div key={eIdx} className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-md p-3.5 text-sm">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{ev.title}</span>
                                <span className={`shrink-0 self-start text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${
                                  ev.credibility === 'HIGH' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400' : 
                                  ev.credibility === 'MEDIUM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400' : 
                                  'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-400'
                                }`}>
                                  {ev.credibility} CREDIBILITY
                                </span>
                              </div>
                              <p className="text-slate-500 dark:text-slate-400 text-sm italic mb-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3">"{ev.snippet}"</p>
                              {ev.sourceUrl && (
                                <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline">
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Source
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
