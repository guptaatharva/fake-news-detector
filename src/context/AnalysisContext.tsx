"use client";

import React, { createContext, useContext, useState } from "react";
import type { ConfidenceBreakdown } from "@/lib/confidence";

export interface Evidence {
  sourceUrl?: string;
  url?: string;
  title: string;
  snippet: string;
  publisher?: string;
  source?: string;
  domain?: string;
  summary?: string;
  credibility: "HIGH" | "MEDIUM" | "LOW";
  credibilityScore?: number;
  publishedAt?: string;
  stance?: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL" | "IRRELEVANT";
  isSatire?: boolean;
}

export type ClaimVerdict = "TRUE" | "MOSTLY_TRUE" | "MIXTURE" | "MOSTLY_FALSE" | "FALSE" | "UNVERIFIABLE" | "SATIRE";

export interface Claim {
  claimText: string;
  verdict: ClaimVerdict;
  explanation: string;
  evidence?: Evidence[];
  confidence?: number;
  confidenceBreakdown?: ConfidenceBreakdown;
  temporalStatus?: string;
  temporalAnalysis?: string;
  agentAgreementScore?: number;
  contextualFactors?: string[];
  injectionAttemptDetected?: boolean;
  lowSourceDiversity?: boolean;
  isSatire?: boolean;
  /** Set when this claim's debate call failed outright (§8.3 partial-failure state). */
  failed?: boolean;
  failureReason?: string;
}

export interface ScrapedSource {
  title: string;
  source: string;
  domain: string;
  url: string;
  sourceUrl: string;
  link: string;
  snippet: string;
  content: string;
  publishedAt?: string;
  byline?: string;
  injectionSuspected?: boolean;
}

export interface AnalysisResult {
  verdict: ClaimVerdict;
  confidenceScore: number;
  confidenceBreakdown?: ConfidenceBreakdown;
  scoreBreakdown: string;
  summary: string;
  claims: Claim[];
  sourceDomains?: string[];
  extractedSources?: ScrapedSource[];
  completedAt?: string;
  lowSourceDiversity?: boolean;
  savedAnalysisId?: string;
}

export type AnalysisStage = "idle" | "extracting" | "searching" | "debating" | "synthesizing" | "complete";
export type AnalysisMode = "url" | "text" | "claim";

export interface DbSaveState {
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
  analysisId?: string;
}

interface AnalysisContextType {
  result: AnalysisResult | null;
  url: string;
  text: string;
  mode: AnalysisMode;
  stage: AnalysisStage;
  logs: string[];
  error: string | null;
  dbSaveState: DbSaveState;
  setUrl: (url: string) => void;
  setText: (text: string) => void;
  setMode: (mode: AnalysisMode) => void;
  setStage: (stage: AnalysisStage) => void;
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  addLog: (msg: string) => void;
  setError: (error: string | null) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setDbSaveState: React.Dispatch<React.SetStateAction<DbSaveState>>;
  resetAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("url");
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dbSaveState, setDbSaveState] = useState<DbSaveState>({ status: "idle" });

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const resetAnalysis = () => {
    setResult(null);
    setUrl("");
    setText("");
    setStage("idle");
    setLogs([]);
    setError(null);
    setDbSaveState({ status: "idle" });
  };

  return (
    <AnalysisContext.Provider
      value={{
        result,
        url,
        text,
        mode,
        stage,
        logs,
        error,
        dbSaveState,
        setUrl,
        setText,
        setMode,
        setStage,
        setLogs,
        addLog,
        setError,
        setAnalysisResult: setResult,
        setDbSaveState,
        resetAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
