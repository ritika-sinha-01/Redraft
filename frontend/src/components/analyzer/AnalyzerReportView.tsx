import type { AnalyzerReport } from "../../types/analyzer";

const VERDICT: Record<string, string> = {
  strong: "Strong — apply with this version",
  "recruiter-ready": "Close — fix the last notes, then apply",
  "needs-work": "Needs work — not ready to submit",
  "not-ready": "Not ready — high-priority gaps remain",
};

export function AnalyzerReportView({ report }: { report: AnalyzerReport }) {
  const tone = report.score >= 80 ? "good" : report.score >= report.target ? "ok" : "low";
  const verdict = report.verdict || (report.score >= report.target ? "recruiter-ready" : "needs-work");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
        <div className={`score-ring ${tone}`}>
          <span className="serif">{report.score}</span>
          <small>/ 100</small>
        </div>
        <div>
          <p className="chip">{VERDICT[verdict] || "ATS score"}</p>
          <h2 className="serif mt-2 text-3xl text-[var(--navy)]">
            {verdict === "strong" || verdict === "recruiter-ready" ? "In recruiter range" : `Aim for ${report.target}+ after the checklist`}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{report.summary}</p>
          {report.confidenceNote ? (
            <p className="mt-3 rounded-xl bg-[var(--paper)] p-3 text-sm">
              <span className="font-semibold">How sure is this? {report.confidence || "low"}. </span>
              {report.confidenceNote}
            </p>
          ) : null}
        </div>
      </div>

      {report.checks?.length ? (
        <div className="card p-5">
          <h3 className="serif text-2xl">How you know it is really good</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A resume is ready when these pass — not when the number looks high. Paste a job description for the last check; that is the actual ATS screen.
          </p>
          <ul className="mt-4 space-y-2">
            {report.checks.map((c) => (
              <li key={c.id} className="flex gap-3 text-sm">
                <span className={c.passed ? "text-[#2f6f4e]" : "text-[#b42318]"}>{c.passed ? "Pass" : "Fail"}</span>
                <span>
                  <strong>{c.label}.</strong> {c.why}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.categories.map((c) => (
          <div key={c.key} className="card p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="serif text-xl">{c.label}</h3>
              <span className="text-sm font-semibold">{c.score}</span>
            </div>
            <div className="score-bar mt-2">
              <span style={{ width: `${c.score}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{c.note}</p>
          </div>
        ))}
      </div>

      {report.keywords ? (
        <div className="card p-5">
          <h3 className="serif text-2xl">{report.keywords.matchPercent}% keyword match</h3>
          <p className="mt-1 text-xs uppercase text-[var(--muted)]">Missing from the job description</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {report.keywords.missing.slice(0, 16).map((k) => (
              <span key={k} className="chip">
                {k}
              </span>
            ))}
            {!report.keywords.missing.length ? <span className="text-sm text-[var(--muted)]">All frequent words appear.</span> : null}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="serif text-2xl">Line-by-line</h3>
        <div className="mt-3 space-y-2">
          {report.lines.map((line, i) => (
            <div key={`${line.location}-${i}`} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--copper-deep)]">{line.location}</p>
                <span className="text-xs font-semibold">{line.score}/100</span>
              </div>
              <p className="mt-1 text-sm">{line.text}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{line.tip}</p>
              {line.fix ? (
                <p className="mt-2 rounded-xl bg-[var(--paper)] p-2 text-sm">
                  <span className="font-semibold text-[var(--copper-deep)]">Try this: </span>
                  {line.fix}
                </p>
              ) : null}
            </div>
          ))}
          {!report.lines.length ? <p className="text-sm text-[var(--muted)]">Add experience bullets to see line scores.</p> : null}
        </div>
      </div>

      <div>
        <h3 className="serif text-2xl">Issues and wins</h3>
        <ul className="mt-3 space-y-2">
          {report.findings.map((f) => (
            <li key={`${f.title}-${f.location || ""}`} className={`card find-${f.severity} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {f.severity} · {f.category}
                {f.location ? ` · ${f.location}` : ""}
              </p>
              <p className="mt-1 font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{f.detail}</p>
              {f.fix ? (
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-[var(--copper-deep)]">How to fix: </span>
                  {f.fix}
                </p>
              ) : null}
              {f.example ? (
                <p className="mt-2 rounded-xl bg-[var(--paper)] p-2 text-sm">
                  <span className="font-semibold">Example: </span>
                  {f.example}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
