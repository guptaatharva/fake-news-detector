"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, ShieldCheck, Activity, BarChart2, Clock, MapPin } from "lucide-react";
import RevealOnScroll from "@/components/animation/RevealOnScroll";

interface Article {
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
  // Simulated meta for signals feed
  category?: string;
  relevance?: number;
  agreement?: number;
}

export default function SignalsFeed() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        // Mock some intelligence metadata for the demo
        const enriched = (data.articles || []).map((a: any) => ({
          ...a,
          category: ["GEOPOLITICS", "TECHNOLOGY", "MARKETS", "CLIMATE"][Math.floor(Math.random() * 4)],
          relevance: Math.floor(80 + Math.random() * 20),
          agreement: Math.floor(70 + Math.random() * 30),
        }));
        setArticles(enriched);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 min-h-[500px] flex flex-col items-center justify-center">
        <Activity className="h-8 w-8 text-neonRed animate-pulse mb-4" />
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          INTERCEPTING GLOBAL SIGNALS...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-16 max-w-7xl mx-auto" id="signals">
      {/* Section Header */}
      <RevealOnScroll className="flex flex-col md:flex-row items-end justify-between gap-6 border-b border-graphite-border pb-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neonRed opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neonRed"></span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neonRed font-semibold">
              LIVE MONITORING
            </span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-foreground tracking-wider">
            GLOBAL SIGNALS
          </h2>
        </div>
        <div className="flex gap-4 font-mono text-xs text-muted-foreground">
          <div className="flex flex-col items-end">
            <span className="text-neonRed">{articles.length}</span>
            <span>ACTIVE VECTORS</span>
          </div>
          <div className="w-px h-8 bg-[#241014]" />
          <div className="flex flex-col items-end">
            <span className="text-foreground">SYSTEM_OK</span>
            <span>STATUS</span>
          </div>
        </div>
      </RevealOnScroll>

      {/* Editorial Grid Layout */}
      <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
        {articles.map((article, index) => {
          const isFeatured = index === 0;

          if (isFeatured) {
            return (
              <RevealOnScroll key={index} className="lg:col-span-12 group">
                <div className="relative rounded-3xl overflow-hidden border border-graphite-border bg-graphite-bg flex flex-col md:flex-row hover:border-neonRed/30 transition-colors">
                  {article.image && (
                    <div className="w-full md:w-3/5 h-64 md:h-[450px] relative overflow-hidden border-b md:border-b-0 md:border-r border-graphite-border">
                      <img src={article.image} alt={article.title} className="absolute inset-0 w-full h-full object-cover opacity-60 dark:mix-blend-screen group-hover:scale-105 transition-transform duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    </div>
                  )}
                  <div className="w-full md:w-2/5 p-8 md:p-12 flex flex-col justify-between relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <ShieldCheck className="w-32 h-32" />
                    </div>
                    <div className="space-y-6 relative z-10">
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
                        <span className="px-2 py-1 bg-neonRed/10 text-neonRed border border-neonRed/20 rounded">{article.category}</span>
                        <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3"/> {article.source.name}</span>
                        <span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(article.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      
                      <h3 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
                        {article.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {article.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-graphite-border">
                        <div>
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">RELEVANCE</div>
                          <div className="flex items-end gap-2 text-neonRed font-mono">
                            <span className="text-2xl leading-none">{article.relevance}%</span>
                            <BarChart2 className="w-4 h-4 mb-0.5" />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">SOURCE AGREEMENT</div>
                          <div className="flex items-end gap-2 text-verificator-verified font-mono">
                            <span className="text-2xl leading-none">{article.agreement}%</span>
                            <Activity className="w-4 h-4 mb-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-4 relative z-10">
                      <Link href={`/dashboard?url=${encodeURIComponent(article.url)}`} className="flex-1">
                        <button className="w-full py-3 rounded-xl bg-neonRed hover:bg-neonRed-bright text-foreground font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,23,68,0.3)] hover:shadow-[0_0_25px_rgba(255,23,68,0.5)]">
                          Initiate Verification
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            );
          }

          // Secondary Articles
          return (
            <RevealOnScroll key={index} delay={(index % 3) * 0.1} className="lg:col-span-4 group cursor-pointer">
              <div className="h-full flex flex-col border-t border-graphite-border pt-6 hover:border-neonRed/50 transition-colors">
                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">
                  <span className="text-neonRed">{article.category}</span>
                  <span>{article.source.name}</span>
                </div>
                
                <h4 className="font-display text-xl font-bold text-foreground leading-snug mb-3 group-hover:text-neonRed transition-colors">
                  {article.title}
                </h4>
                
                <div className="mt-auto pt-6 flex items-center justify-between font-mono text-[10px]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-verificator-verified">
                      <div className="h-1.5 w-1.5 rounded-full bg-verificator-verified" />
                      AGREEMENT {article.agreement}%
                    </span>
                  </div>
                  
                  <Link href={`/dashboard?url=${encodeURIComponent(article.url)}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-neonRed flex items-center gap-1 underline underline-offset-4">
                      VERIFY <ExternalLink className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>
    </div>
  );
}