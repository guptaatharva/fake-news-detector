"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Globe,
  Search,
  BrainCircuit,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function ReadyPanel() {
  const steps = [
    {
      icon: Search,
      title: "Extract Claims",
      description: "Identify factual claims from the submitted content.",
    },
    {
      icon: Globe,
      title: "Search the Web",
      description: "Find trusted independent sources in real time.",
    },
    {
      icon: BrainCircuit,
      title: "AI Reasoning",
      description: "Compare evidence using the verification model.",
    },
    {
      icon: CheckCircle2,
      title: "Generate Verdict",
      description: "Produce a confidence score and explanation.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 35 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="overflow-hidden rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl shadow-[0_0_60px_rgba(20,184,166,.08)]">

        <CardContent className="p-10">

          <div className="flex flex-col items-center text-center">

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-blue-600/20">

              <ShieldCheck className="h-12 w-12 text-teal-400" />

            </div>

            <h2 className="mt-8 text-4xl font-bold text-white">
              Ready to Verify
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
              Paste a news article or URL to begin a complete AI-powered
              verification. VeraCius searches the web, gathers evidence,
              compares sources and generates a transparent verdict.
            </p>

          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">

            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + index * 0.1,
                  }}
                  className="rounded-2xl border border-white/10 bg-black/20 p-6 transition-all duration-300 hover:border-teal-500/40 hover:bg-black/30"
                >
                  <div className="flex items-start gap-4">

                    <div className="rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-600/20 p-3">

                      <Icon className="h-6 w-6 text-teal-400" />

                    </div>

                    <div>

                      <h3 className="text-lg font-semibold text-white">
                        {step.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {step.description}
                      </p>

                    </div>

                  </div>
                </motion.div>
              );
            })}

          </div>

          

        </CardContent>

      </Card>
    </motion.div>
  );
}