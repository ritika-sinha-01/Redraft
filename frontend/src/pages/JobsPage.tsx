import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ResumeDto } from "../types/resume";
import type { AnalyzerReport } from "../types/analyzer";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  description: string;
  url?: string;
  source?: string;
  salary?: string;
  matchPercent?: number;
  matchedSkills?: string[];
}

export function JobsPage() {
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [apps, setApps] = useState<{ id: string; jobTitle: string; company: string; status: string; jobUrl?: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [queryUsed, setQueryUsed] = useState("");
  const [live, setLive] = useState(true);
  const [sourceNote, setSourceNote] = useState("");
  const [tailoring, setTailoring] = useState<string | null>(null);
  const [tailored, setTailored] = useState<{
    jobTitle: string;
    company: string;
    resumeId: string;
    letterId: string;
    applicationId: string;
    score: number;
  } | null>(null);

  async function load(query = q, nextResumeId = resumeId) {
    setLoading(true);
    setError("");
    try {
      const [j, r, a] = await Promise.all([
        api<{ jobs: Job[]; query: string; live: boolean; sourceNote: string }>(
          `/api/jobs?q=${encodeURIComponent(query)}&resumeId=${encodeURIComponent(nextResumeId)}&location=India`
        ),
        api<{ resumes: ResumeDto[] }>("/api/resumes"),
        api<{ applications: { id: string; jobTitle: string; company: string; status: string; jobUrl?: string }[] }>(
          "/api/jobs/applications"
        ),
      ]);
      setJobs(j.jobs);
      setQueryUsed(j.query);
      setLive(j.live);
      setSourceNote(j.sourceNote);
      setResumes(r.resumes);
      setApps(a.applications);
      if (!nextResumeId && r.resumes[0]) {
        setResumeId(r.resumes[0].id);
        if (r.resumes[0].id !== nextResumeId) {
          const matched = await api<{ jobs: Job[]; query: string; live: boolean; sourceNote: string }>(
            `/api/jobs?q=${encodeURIComponent(query)}&resumeId=${encodeURIComponent(r.resumes[0].id)}&location=India`
          );
          setJobs(matched.jobs);
          setQueryUsed(matched.query);
          setLive(matched.live);
          setSourceNote(matched.sourceNote);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load live openings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const selected = resumes.find((r) => r.id === resumeId);

  async function tailor(job: Job) {
    if (!resumeId) {
      setError("Select a resume first.");
      return;
    }
    setTailoring(job.id);
    setError("");
    setMsg("");
    try {
      const data = await api<{
        resume: { id: string; title: string };
        letterId: string;
        application: { id: string };
        report: AnalyzerReport;
      }>("/api/jobs/tailor", {
        method: "POST",
        body: JSON.stringify({
          resumeId,
          jobTitle: job.title,
          company: job.company,
          jobUrl: job.url || "",
          jobDescription: job.description,
        }),
      });
      setTailored({
        jobTitle: job.title,
        company: job.company,
        resumeId: data.resume.id,
        letterId: data.letterId,
        applicationId: data.application.id,
        score: data.report.score,
      });
      setMsg(`Tailored a resume for ${job.title} at ${job.company}. ATS ${data.report.score}/100.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not tailor that role");
    } finally {
      setTailoring(null);
    }
  }

  return (
    <div className="page grid gap-8 bg-[var(--cream)] lg:grid-cols-[1fr_280px]">
      <div>
        <p className="chip">{live ? "Live openings" : "Jobs"}</p>
        <h1 className="serif mt-3 text-4xl">Roles that match your resume</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          {sourceNote || "Latest postings ranked against your title, skills, and location."}
          {queryUsed ? ` Searching “${queryUsed}”.` : ""}
        </p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load().catch(() => undefined);
          }}
        >
          <input
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Override search — or leave blank to use your resume"
          />
          <button className="btn btn-copper" type="submit">
            Refresh
          </button>
        </form>
        {error ? <p className="form-error mt-3">{error}</p> : null}
        {msg ? <p className="mt-3 text-sm text-emerald-800">{msg}</p> : null}
        {tailored ? (
          <div className="card mt-4 p-4">
            <p className="text-sm">
              Ready for <strong>{tailored.jobTitle}</strong> at {tailored.company}. Score {tailored.score}/100.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="btn btn-sm btn-copper" to={`/editor/${tailored.resumeId}`}>
                Open resume
              </Link>
              <Link className="btn btn-sm btn-ghost" to={`/analyzer?resumeId=${tailored.resumeId}`}>
                ATS report
              </Link>
              <Link className="btn btn-sm btn-ghost" to={`/cover-letters/${tailored.letterId}`}>
                Cover letter
              </Link>
              <Link className="btn btn-sm btn-ghost" to={`/applications?highlight=${tailored.applicationId}`}>
                Tracker
              </Link>
            </div>
          </div>
        ) : null}
        {loading ? <p className="mt-6 text-sm text-[var(--muted)]">Finding live openings…</p> : null}
        {!loading && jobs.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">No openings matched. Try another resume or a broader search.</p>
        ) : null}
        <div className="mt-6 space-y-4">
          {jobs.map((job) => (
            <article key={job.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {job.matchPercent != null ? (
                      <span className="chip">{job.matchPercent}% match</span>
                    ) : null}
                    {job.source ? <span className="text-xs text-[var(--muted)]">{job.source}</span> : null}
                    <span className="text-xs text-[var(--muted)]">{job.posted}</span>
                  </div>
                  <h2 className="serif text-2xl">{job.title}</h2>
                  <p className="text-sm text-[var(--muted)]">
                    {job.company} · {job.location} · {job.type}
                    {job.salary ? ` · ${job.salary}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    disabled={!!tailoring}
                    onClick={() => void tailor(job)}
                  >
                    {tailoring === job.id ? "Tailoring…" : "Tailor for this job"}
                  </button>
                  <Link
                    className="btn btn-sm btn-ghost"
                    to={`/cover-letters?company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}&jd=${encodeURIComponent(job.description)}${resumeId ? `&resumeId=${resumeId}` : ""}`}
                  >
                    Cover letter
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-copper"
                    onClick={async () => {
                      if (!resumeId) {
                        setError("Select a resume first.");
                        return;
                      }
                      await api("/api/jobs/apply", {
                        method: "POST",
                        body: JSON.stringify({
                          resumeId,
                          jobTitle: job.title,
                          company: job.company,
                          jobUrl: job.url || "",
                        }),
                      });
                      setMsg(`Saved application to ${job.title} at ${job.company}`);
                      if (job.url) window.open(job.url, "_blank", "noopener,noreferrer");
                      await load();
                    }}
                  >
                    {job.url ? "Apply on site" : "Save application"}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm">{job.description}</p>
              {job.matchedSkills?.length ? (
                <p className="mt-3 text-xs text-[var(--muted)]">Matched: {job.matchedSkills.join(" · ")}</p>
              ) : null}
            </article>
          ))}
        </div>
        <p className="mt-6 text-xs text-[var(--muted)]">
          Listings cover intern, experienced, and senior roles — on-site, hybrid, and remote. Apply on the employer’s page.
        </p>
      </div>
      <aside>
        <label className="text-xs font-semibold uppercase text-[var(--muted)]">
          Match to resume
          <select
            className="field mt-1"
            value={resumeId}
            onChange={(e) => {
              const id = e.target.value;
              setResumeId(id);
              load(q, id).catch(() => undefined);
            }}
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Using {(selected.content.experience.find((x) => x.title)?.title || "your latest role") +
              (selected.content.skills.length ? ` · ${selected.content.skills.slice(0, 4).join(", ")}` : "")}
          </p>
        ) : null}
        <div className="mt-8 flex items-baseline justify-between">
          <h3 className="serif text-xl">My applications</h3>
          <Link to="/applications" className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Open tracker
          </Link>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {apps.slice(0, 8).map((a) => (
            <li key={a.id} className="card p-3">
              {a.jobTitle} · {a.company}
              <div className="text-xs text-[var(--muted)]">{a.status}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
