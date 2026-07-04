"use client";

import { useState } from "react";
import { ShieldCheck, Link2, FileText, Loader2, ImageIcon, FileUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface VerifyCardProps {
  url: string;
  text: string;
  isLoading: boolean;
  setUrl: (value: string) => void;
  setText: (value: string) => void;
  handleAnalyze: (mode: "url" | "text") => void;
}

export default function VerifyCard({
  url,
  text,
  isLoading,
  setUrl,
  setText,
  handleAnalyze,
}: VerifyCardProps) {
  const [mode, setMode] = useState<"url" | "text">("url");

  const words =
    text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden rounded-3xl border border-white/10 bg-[#101010]/80 backdrop-blur-xl shadow-[0_0_60px_rgba(20,184,166,.08)]">
        <CardHeader className="border-b border-white/10 px-8 py-6">

  <div className="flex items-center gap-4">

    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-blue-600/20">

      <ShieldCheck className="h-7 w-7 text-teal-400" />

    </div>

    <div>

      <CardTitle className="text-3xl font-bold text-white">
        Verify Content
      </CardTitle>

      <p className="mt-1 text-gray-400">
        Paste a URL or article to begin AI-powered verification.
      </p>

    </div>

  </div>

</CardHeader>

        <CardContent className="space-y-8 p-8">
          <div className="grid grid-cols-2 rounded-2xl bg-[#181818] p-1">
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`flex h-14 items-center justify-center gap-2 rounded-xl font-medium transition ${
                mode === "url"
                  ? "bg-gradient-to-r from-teal-500 to-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Link2 className="h-4 w-4" />
              URL
            </button>

            <button
              type="button"
              onClick={() => setMode("text")}
              className={`flex h-14 items-center justify-center gap-2 rounded-xl font-medium transition ${
                mode === "text"
                  ? "bg-gradient-to-r from-teal-500 to-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileText className="h-4 w-4" />
              Text
            </button>
          </div>

          {mode === "url" ? (
            <div className="space-y-6">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/news/article"
                disabled={isLoading}
                className="h-16 rounded-2xl border-white/10 bg-black/40 text-white"
              />

              <Button
                onClick={() => handleAnalyze("url")}
                disabled={!url || isLoading}
                className="h-16 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 text-lg font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Analyze URL"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the article, news report or social media claim here..."
                disabled={isLoading}
                className="min-h-[260px] rounded-2xl border-white/10 bg-black/40 px-5 py-4 text-white"
              />

              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Words: <span className="font-semibold text-white">{words}</span></span>
                <span>Characters: <span className="font-semibold text-white">{text.length}</span></span>
              </div>

              <Button
                onClick={() => handleAnalyze("text")}
                disabled={text.length < 50 || isLoading}
                className="h-16 w-full rounded-2xl bg-gradient-to-r from-teal-500 to-blue-600 text-lg font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Analyze Text"
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <ImageIcon className="mx-auto mb-4 h-9 w-9 text-teal-400" />
              <p className="font-medium text-white">Screenshot Upload</p>
              <p className="mt-2 text-m text-white">Coming Soon</p>
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <FileUp className="mx-auto mb-4 h-9 w-9 text-blue-400" />
              <p className="font-medium text-white">PDF Upload</p>
              <p className="mt-2 text-m text-white">Coming Soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
