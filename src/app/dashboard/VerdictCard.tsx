"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface VerdictCardProps {
  result: any;
}

export default function VerdictCard({
  result,
}: VerdictCardProps) {

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
      initial={{
        opacity:0,
        y:30,
      }}
      animate={{
        opacity:1,
        y:0,
      }}
    >

      <Card className="overflow-hidden rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl">

        <div
          className={`bg-gradient-to-r ${getColor(result.verdict)} p-8`}
        >

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

          <h3 className="mb-4 text-xl font-bold text-white">

            AI Summary

          </h3>

          <p className="leading-8 text-gray-400">

            {result.summary}

          </p>

        </CardContent>

      </Card>

    </motion.div>

  );

}