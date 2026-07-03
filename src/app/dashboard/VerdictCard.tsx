"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VerdictCardProps {
  result: any;
}

export default function VerdictCard({
  result,
}: VerdictCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  function getIcon(verdict: string) {
    switch (verdict) {
      case "TRUE":
      case "MOSTLY_TRUE":
        return <ShieldCheck className="h-12 w-12 text-emerald-400"/>;
      case "FALSE":
      case "MOSTLY_FALSE":
        return <ShieldAlert className="h-12 w-12 text-rose-400"/>;
      case "MIXTURE":
        return <AlertTriangle className="h-12 w-12 text-amber-400"/>;
      default:
        return <HelpCircle className="h-12 w-12 text-gray-400"/>;
    }
  }

  function getColor(verdict: string) {
    switch (verdict) {
      case "TRUE":
        return "from-emerald-500 to-green-600";
      case "MOSTLY_TRUE":
        return "from-green-500 to-emerald-600";
      case "FALSE":
        return "from-red-500 to-rose-600";
      case "MOSTLY_FALSE":
        return "from-orange-500 to-red-600";
      case "MIXTURE":
        return "from-amber-500 to-orange-500";
      default:
        return "from-slate-500 to-slate-600";
    }
  }

  return (
    <motion.div
      initial={{ opacity:0, y:30 }}
      animate={{ opacity:1, y:0 }}
    >
      <Card className="overflow-hidden rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl">
        <div className={`bg-gradient-to-r ${getColor(result.verdict)} p-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {getIcon(result.verdict)}
              <div>
                <p className="uppercase tracking-[6px] text-white/70 text-sm">
                  FINAL VERDICT
                </p>
                <h2 className="mt-2 text-5xl font-black text-white">
                  {result.verdict.replaceAll("_"," ")}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">
                Confidence
              </p>
              <h1 className="text-6xl font-black text-white">
                {result.confidenceScore}%
              </h1>
            </div>
          </div>
        </div>

        <CardContent className="p-8">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xl font-bold text-white">
                AI Summary
              </h3>
              <p className="leading-8 text-gray-400">
                {result.summary}
              </p>
            </div>
            
            {result.scoreBreakdown && (
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full flex justify-between items-center bg-[#181818] border-white/10 text-white hover:bg-[#202020] hover:text-white h-12 rounded-xl"
                >
                  <span className="font-semibold text-base">View Score Breakdown</span>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </Button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-white/10 bg-black/40 p-6">
                        <p className="leading-8 text-gray-300">
                          {result.scoreBreakdown}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}