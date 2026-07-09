"use client";

import { motion } from "framer-motion";

export default function DashboardHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="relative mb-20 flex justify-center"
    >
      {/* Aurora Glow */}
      <div className="absolute -top-24 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-[140px]" />

      <div className="relative max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 text-sm uppercase tracking-[12px] text-teal-400"
        >
          AI FACT CHECKING DASHBOARD
        </motion.p>

        <div className="flex flex-wrap justify-center gap-5">
          <motion.h1
            initial={{ opacity: 0, y: 45, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7 }}
            className="text-6xl lg:text-8xl font-black text-white"
          >
            Analysis
          </motion.h1>

          <motion.h1
            initial={{ opacity: 0, y: 45, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.18, duration: 0.7 }}
            className="text-6xl lg:text-8xl font-black bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 bg-clip-text text-transparent"
          >
            Workspace
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mx-auto mt-10 max-w-4xl text-xl leading-9 text-gray-400"
        >
          Paste a{" "}
          <span className="font-semibold text-white">
            news article
          </span>
          ,{" "}
          <span className="font-semibold text-white">
            URL
          </span>{" "}
          or{" "}
          <span className="font-semibold text-white">
            social media claim
          </span>{" "}
          and let{" "}
          <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text font-bold text-transparent">
            VeraCius AI
          </span>{" "}
          search the live web, gather trusted evidence,
          compare independent sources and generate an
          explainable fact-checking report.
        </motion.p>
      </div>
    </motion.section>
  );
}