import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AnalyzerReportView } from "../components/analyzer/AnalyzerReportView";
import type { AnalyzerReport } from "../types/analyzer";
import type { ResumeDto } from "../types/resume";

type AtsRun = {
  id: string;
  resumeId?: string;
  resumeTitle?: string;
  score: number;
  label?: string;
  jobDescription?: string;
  createdAt: string;
  report: AnalyzerReport;
};

const VERDICT: Record<string, string> = {
  strong: "Strong",
  "recruiter-ready": "Close",
  "needs-work": "Needs work",
  "not-ready": "Not ready",
};

export function AnalyzerPage() {
  const [params] = useSearchParams();
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [resumeId, setResumeId] = useState(params.get("resumeId") || "");
  const [jd, setJd] = useState(params.get("jd") || "");
  const [report, setReport] = useState<AnalyzerReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState<AtsRun[]>([]);
  const [allRuns, setAllRuns] = useState<AtsRun[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  useEffect(() => {
    api<{ resumes: ResumeDto[] }>("/api/resumes")
      .then((data) => {
        setResumes(data.resumes);
        if (!resumeId && data.resumes[0]) setResumeId(data.resumes[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load resumes"));
    api<{ runs: AtsRun[] }>("/api/ats/runs")
      .then((d) => setAllRuns(d.runs))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    api<{ runs: AtsRun[] }>(`/api/ats/history/${resumeId}`)
      .then((d) => {
        setRuns(d.runs);
        if (!report && d.runs[0]) setReport(d.runs[0].report);
        if (d.runs[0] && !jd && d.runs[0].jobDescription) setJd(d.runs[0].jobDescription);
      })
      .catch(() => undefined);
  }, [resumeId]);

  async function run() {
    if (!resumeId) {
      setError("Select a resume first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<AnalyzerReport>("/api/ats/check", {
        method: "POST",
        body: JSON.stringify({ resumeId, jobDescription: jd }),
      });
      setReport(data);
      const hist = await api<{ runs: AtsRun[] }>(`/api/ats/history/${resumeId}`).catch(() => null);
      if (hist) setRuns(hist.runs);
      const all = await api<{ runs: AtsRun[] }>("/api/ats/runs").catch(() => null);
      if (all) setAllRuns(all.runs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not analyse that resume");
    } finally {
      setBusy(false);
    }
  }

  const left = allRuns.find((r) => r.id === leftId) || runs.find((r) => r.id === leftId);
  const right = allRuns.find((r) => r.id === rightId) || runs.find((r) => r.id === rightId);
  const comparePool = allRuns.length ? allRuns : runs;

  return (
    <div className="page bg-[var(--cream)]">
      <p className="chip">ATS analyser</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Score a resume like a recruiter would</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        A high number alone does not mean the resume is good. Paste the job description, then use the pass/fail checklist. Ready means 75+, no high-severity issues, and 70%+ keyword match to that posting.
      </p>
      {error ? <p className="form-error mt-4 max-w-xl">{error}</p> : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[320px_1fr]">
        <aside className="card h-fit space-y-4 p-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Resume
            <select className="field mt-1" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Job description (optional)
            <textarea
              className="field mt-1 min-h-36"
              placeholder="Paste a JD to score keyword match"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </label>
          <button type="button" className="btn btn-copper w-full" disabled={busy || !resumeId} onClick={() => void run()}>
            {busy ? "Scoring…" : "Analyse ATS score"}
          </button>
          {runs.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Score history</p>
              <ul className="mt-2 space-y-1">
                {runs.map((r) => {
                  const verdict = r.report.verdict || "";
                  const match = r.report.keywords?.matchPercent;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="w-full rounded-xl px-2 py-1.5 text-left text-sm hover:bg-[var(--paper)]"
                        onClick={() => {
                          setReport(r.report);
                          if (r.jobDescription) setJd(r.jobDescription);
                        }}
                      >
                        <span className="font-semibold">{r.score}/100</span>
                        {verdict ? ` · ${VERDICT[verdict] || verdict}` : ""}
                        {match != null ? ` · ${match}% keywords` : ""}
                        <span className="block text-xs text-[var(--muted)]">
                          {r.label || r.resumeTitle || "Run"} · {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {comparePool.length >= 2 ? (
            <div className="space-y-2 border-t border-[var(--line)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Compare two runs</p>
              <select className="field" value={leftId} onChange={(e) => setLeftId(e.target.value)}>
                <option value="">Earlier run</option>
                {comparePool.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.score} · {r.label || r.resumeTitle || "Run"}
                  </option>
                ))}
              </select>
              <select className="field" value={rightId} onChange={(e) => setRightId(e.target.value)}>
                <option value="">Later run</option>
                {comparePool.map((r) => (
                  <option key={`b-${r.id}`} value={r.id}>
                    {r.score} · {r.label || r.resumeTitle || "Run"}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </aside>
        <div className="space-y-6">
          {left && right ? (
            <div className="card grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Earlier</p>
                <p className="serif text-3xl">{left.score}</p>
                <p className="text-sm text-[var(--muted)]">
                  {left.label || left.resumeTitle} · {left.report.keywords?.matchPercent ?? "—"}% keywords
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Later</p>
                <p className="serif text-3xl">{right.score}</p>
                <p className="text-sm text-[var(--muted)]">
                  {right.label || right.resumeTitle} · {right.report.keywords?.matchPercent ?? "—"}% keywords
                </p>
                <p className="mt-2 text-sm">
                  {right.score - left.score >= 0 ? "+" : ""}
                  {right.score - left.score} vs the earlier run
                </p>
              </div>
            </div>
          ) : null}
          {report ? (
            <AnalyzerReportView report={report} />
          ) : (
            <div className="card p-10 text-center">
              <h2 className="serif text-2xl">No report yet</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Pick a resume and run the analyser. Target score is 75+.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
