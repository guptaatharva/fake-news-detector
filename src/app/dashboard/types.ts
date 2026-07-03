export interface Evidence {
  url: string;
  title: string;
  snippet: string;
}

export interface Claim {
  claim: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  evidence: Evidence[];
}

export interface AnalysisResult {
  verdict: string;
  confidence: number;
  summary: string;
  claims: Claim[];
}