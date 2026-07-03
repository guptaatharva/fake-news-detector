"use client";

import { motion } from "framer-motion";
import {
  Search,
  Globe,
  BrainCircuit,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface AgentTerminalProps {
  stage: "idle" | "extracting" | "searching" | "synthesizing" | "complete";
  logs: string[];
}

export default function AgentTerminal({
  stage,
  logs,
}: AgentTerminalProps) {
  const steps = [
    {
      id: "extracting",
      title: "Extracting Claims",
      icon: Search,
    },
    {
      id: "searching",
      title: "Searching Live Web",
      icon: Globe,
    },
    {
      id: "synthesizing",
      title: "AI Reasoning",
      icon: BrainCircuit,
    },
    {
      id: "complete",
      title: "Generating Verdict",
      icon: CheckCircle2,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}

      <div className="border-b border-white/10 px-8 py-6">

        <div className="flex items-center gap-3">

          <Loader2 className="h-6 w-6 animate-spin text-teal-400"/>

          <div>

            <h2 className="text-2xl font-bold text-white">
              Live AI Agent
            </h2>

            <p className="text-sm text-gray-400">
              Autonomous verification in progress
            </p>

          </div>

        </div>

      </div>

      {/* Steps */}

      <div className="grid gap-4 p-8 md:grid-cols-2">

        {steps.map((step) => {

          const Icon = step.icon;

          const active =
            stage === step.id ||
            (stage === "searching" && step.id === "extracting") ||
            (stage === "synthesizing" &&
              (step.id === "extracting" || step.id === "searching")) ||
            (stage === "complete");

          return (

            <div
              key={step.id}
              className={`rounded-2xl border p-5 transition-all ${
                active
                  ? "border-teal-500/40 bg-teal-500/10"
                  : "border-white/10 bg-black/20"
              }`}
            >

              <div className="flex items-center gap-4">

                <div
                  className={`rounded-xl p-3 ${
                    active
                      ? "bg-teal-500/20"
                      : "bg-black/30"
                  }`}
                >

                  <Icon
                    className={`h-6 w-6 ${
                      active
                        ? "text-teal-400"
                        : "text-gray-500"
                    }`}
                  />

                </div>

                <div>

                  <h3 className="font-semibold text-white">

                    {step.title}

                  </h3>

                  <p className="text-sm text-gray-500">

                    {active
                      ? "Completed"
                      : "Waiting..."}

                  </p>

                </div>

              </div>

            </div>

          );

        })}

      </div>

      {/* Terminal */}

      <div className="border-t border-white/10 bg-black p-8">

        <h3 className="mb-4 font-semibold text-teal-400">
          LIVE TERMINAL
        </h3>

        <div className="h-72 overflow-y-auto rounded-xl bg-black p-4 font-mono text-sm">

          {logs.map((log, i) => (

            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 text-green-400"
            >
              {'>'} {log}
            </motion.div>

          ))}

          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
            className="text-green-500"
          >
            ▋
          </motion.div>

        </div>

      </div>

    </motion.div>
  );
}