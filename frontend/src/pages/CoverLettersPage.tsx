import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { LlmSettingsPanel } from "../components/ai/LlmSettingsPanel";
import type { CoverLetterDto } from "../types/coverLetter";
import type { ResumeDto } from "../types/resume";

export function CoverLettersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [letters, setLetters] = useState<CoverLetterDto[]>([]);
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [resumeId, setResumeId] = useState(params.get("resumeId") || "");
  const [company, setCompany] = useState(params.get("company") || "");
  const [role, setRole] = useState(params.get("role") || "");
  const [jobDescription, setJobDescription] = useState(params.get("jd") || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ letters: CoverLetterDto[] }>("/api/cover-letters"),
      api<{ resumes: ResumeDto[] }>("/api/resumes"),
    ])
      .then(([l, r]) => {
        setLetters(l.letters);
        setResumes(r.resumes);
        if (!resumeId && r.resumes[0]) setResumeId(r.resumes[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load cover letters"));
  }, []);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ letter: CoverLetterDto }>("/api/cover-letters", {
        method: "POST",
        body: JSON.stringify({ resumeId: resumeId || undefined, company, role, jobDescription }),
      });
      navigate(`/cover-letters/${data.letter.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate that letter");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page bg-[var(--cream)]">
      <p className="chip">Cover letters</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Write a letter from your resume and the job</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Paste any company’s description, pick the resume to reference, then edit layout and download PDF or Word.
      </p>
      {error ? <p className="form-error mt-4 max-w-xl">{error}</p> : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_320px]">
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Resume for reference
            <select className="field mt-1" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
              <option value="">None</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Company
              <input className="field mt-1" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Role
              <input className="field mt-1" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Product designer" />
            </label>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Job description
            <textarea
              className="field mt-1"
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the posting here"
            />
          </label>
          <button className="btn btn-copper" type="submit" disabled={busy}>
            {busy ? "Writing…" : "Generate cover letter"}
          </button>
        </form>
        <LlmSettingsPanel />
      </div>

      <h2 className="serif mt-12 text-2xl">Saved letters</h2>
      {letters.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">None yet — generate one above.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {letters.map((letter) => (
            <Link key={letter.id} to={`/cover-letters/${letter.id}`} className="card card-interactive p-5 no-underline">
              <h3 className="serif text-xl">{letter.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {[letter.role, letter.company].filter(Boolean).join(" · ") || "Untitled"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
