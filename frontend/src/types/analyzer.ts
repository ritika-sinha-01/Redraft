export type AnalyzerFinding = {
  severity: "high" | "medium" | "low" | "good";
  category: "impact" | "brevity" | "style" | "ats";
  title: string;
  detail: string;
  location?: string;
  fix?: string;
  example?: string;
};

export type AnalyzerReport = {
  score: number;
  atsFriendly: boolean;
  target: number;
  summary: string;
  verdict?: "not-ready" | "needs-work" | "recruiter-ready" | "strong";
  confidence?: "low" | "medium" | "high";
  confidenceNote?: string;
  readyWhen?: string[];
  checks?: { id: string; label: string; passed: boolean; why: string }[];
  categories: { key: string; label: string; score: number; note: string }[];
  findings: AnalyzerFinding[];
  lines: { location: string; text: string; score: number; tip: string; fix?: string }[];
  keywords?: { present: string[]; missing: string[]; matchPercent: number };
  warnings: { code: string; message: string }[];
};
