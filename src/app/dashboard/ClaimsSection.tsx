"use client";

import { motion } from "framer-motion";
import { ExternalLink, FileText, Link2 } from "lucide-react";

interface ClaimsSectionProps {
  claims: any[];
}

export default function ClaimsSection({
  claims,
}: ClaimsSectionProps) {

  function badge(verdict: string) {

    switch (verdict) {

      case "TRUE":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

      case "MOSTLY_TRUE":
        return "bg-green-500/20 text-green-400 border-green-500/30";

      case "MIXTURE":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";

      case "MOSTLY_FALSE":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";

      case "FALSE":
        return "bg-red-500/20 text-red-400 border-red-500/30";

      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";

    }

  }

  function credibility(color: string) {

    switch (color) {

      case "HIGH":
        return "bg-emerald-500/20 text-emerald-400";

      case "MEDIUM":
        return "bg-amber-500/20 text-amber-400";

      default:
        return "bg-red-500/20 text-red-400";

    }

  }

  return (

    <div className="space-y-6">

      <div className="flex items-center gap-3">

        <FileText className="h-6 w-6 text-teal-400"/>

        <h2 className="text-3xl font-bold text-white">

          Claims Breakdown

        </h2>

      </div>

      {claims.map((claim, index)=>(

        <motion.div
          key={index}
          initial={{
            opacity:0,
            y:25,
          }}
          animate={{
            opacity:1,
            y:0,
          }}
          transition={{
            delay:index*0.1,
          }}
          className="rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl overflow-hidden"
        >

          <div className="p-8">

            <div className="flex items-start justify-between gap-5">

              <div>

                <h3 className="text-2xl font-semibold text-white">

                  {claim.claimText}

                </h3>

                <p className="mt-4 leading-8 text-gray-400">

                  {claim.explanation}

                </p>

              </div>

              <div
                className={`rounded-full border px-5 py-2 text-sm font-bold ${badge(claim.verdict)}`}
              >

                {claim.verdict.replaceAll("_"," ")}

              </div>

            </div>

            {claim.evidence &&
              claim.evidence.length>0 && (

              <div className="mt-10 space-y-5">

                <h4 className="flex items-center gap-2 font-semibold text-white">

                  <Link2 className="h-4 w-4"/>

                  Evidence

                </h4>

                {claim.evidence.map((ev:any,e:number)=>(

                  <div
                    key={e}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >

                    <div className="flex items-center justify-between">

                      <h5 className="font-semibold text-white">

                        {ev.title}

                      </h5>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${credibility(ev.credibility)}`}
                      >

                        {ev.credibility}

                      </span>

                    </div>

                    <p className="mt-4 italic leading-7 text-gray-400">

                      "{ev.snippet}"

                    </p>

                    {ev.sourceUrl && (

                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 text-teal-400 hover:text-teal-300"
                      >

                        <ExternalLink className="h-4 w-4"/>

                        View Source

                      </a>

                    )}

                  </div>

                ))}

              </div>

            )}

          </div>

        </motion.div>

      ))}

    </div>

  );

}