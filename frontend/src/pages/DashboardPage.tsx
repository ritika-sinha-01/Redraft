import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, createResumeFromImport, parseResumeFile } from "../api/client";
import { ImportResumePanel } from "../components/import/ImportResumePanel";
import { ResumeDocument } from "../templates";
import { SAMPLE_CONTENT, type ResumeDto } from "../types/resume";

export function DashboardPage() {
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const navigate = useNavigate();

  async function refresh() {
    const data = await api<{ resumes: ResumeDto[] }>("/api/resumes");
    setResumes(data.resumes);
  }

  useEffect(() => {
    refresh()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load resumes"))
      .finally(() => setLoading(false));
  }, []);

  async function duplicate(r: ResumeDto) {
    try {
      const data = await api<{ resume: ResumeDto }>("/api/resumes", {
        method: "POST",
        body: JSON.stringify({
          templateId: r.templateId,
          title: `${r.title} (copy)`,
          sourceResumeId: r.id,
        }),
      });
      navigate(`/editor/${data.resume.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not duplicate");
    }
  }

  return (
    <div className="page bg-[var(--cream)]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="chip">Library</p>
          <h1 className="serif mt-3 text-4xl text-[var(--navy)]">My resumes</h1>
        </div>
        <Link to="/templates" className="btn btn-copper">
          Build Your Resume Now
        </Link>
      </div>
      {error ? <p className="form-error mb-4 max-w-xl">{error}</p> : null}

      <div className="mb-8 max-w-2xl">
        <ImportResumePanel
          heading="Add an existing resume"
          subtitle="Upload a PDF, Word (.docx), or paste the text. We’ll fill the fields and open the editor."
          existingResumes={resumes}
          onParsed={async (content, _warnings, titleHint) => {
            const data = await createResumeFromImport(content, titleHint);
            navigate(`/editor/${data.resume.id}`);
          }}
          onUseExisting={async (resume) => {
            const data = await createResumeFromImport(resume.content, `${resume.title} (copy)`);
            navigate(`/editor/${data.resume.id}`);
          }}
        />
      </div>

      {loading ? <p className="text-[var(--muted)]">Loading…</p> : null}
      {!loading && resumes.length === 0 ? (
        <div className="card mx-auto max-w-lg p-12 text-center">
          <div className="empty-mark" aria-hidden>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
              <path d="M14 3v6h6M8 13h8M8 17h5" />
            </svg>
          </div>
          <h2 className="serif text-2xl">Nothing on the desk yet</h2>
          <p className="mt-2 text-[var(--muted)]">Upload a file above, or start from a blank template.</p>
          <Link to="/templates" className="btn btn-copper mt-6">
            Build Your Resume Now
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((r) => (
            <div key={r.id} className="card card-interactive overflow-hidden">
              <div className="thumb-frame">
                <div className="origin-top-left scale-[0.3]">
                  <div className="w-[794px]">
                    <ResumeDocument
                      content={r.content || SAMPLE_CONTENT}
                      slug={r.template?.slug || "classic"}
                      accentColor={r.designPreferences?.accentColor}
                      fontFamily={r.designPreferences?.fontFamily}
                      layout={r.layoutPreferences}
                    />
                  </div>
                </div>
              </div>
              <div className="p-5">
                {renameId === r.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await api(`/api/resumes/${r.id}`, { method: "PUT", body: JSON.stringify({ title: rename }) });
                      setRenameId(null);
                      await refresh();
                    }}
                  >
                    <input className="field" value={rename} onChange={(e) => setRename(e.target.value)} />
                    <button className="btn btn-sm btn-copper" type="submit">
                      Save
                    </button>
                  </form>
                ) : (
                  <h2 className="serif text-2xl">{r.title}</h2>
                )}
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {r.template?.name} · Last edited {new Date(r.updatedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {r.versionCount ?? 0} saved versions · {r.atsRunCount ?? 0} ATS runs
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-sm btn-copper" onClick={() => navigate(`/editor/${r.id}`)}>
                    Update
                  </button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => navigate(`/analyzer?resumeId=${r.id}`)}>
                    ATS score
                  </button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => void duplicate(r)}>
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setRenameId(r.id);
                      setRename(r.title);
                    }}
                  >
                    Rename
                  </button>
                  <label className="btn btn-sm btn-ghost cursor-pointer">
                    {importingId === r.id ? "Filling…" : "Replace from file"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      className="hidden"
                      disabled={importingId === r.id}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setImportingId(r.id);
                        try {
                          const data = await parseResumeFile(file);
                          await api(`/api/resumes/${r.id}`, { method: "PUT", body: JSON.stringify({ content: data.content }) });
                          navigate(`/editor/${r.id}`);
                        } catch (err) {
                          setError(err instanceof ApiError ? err.message : "Could not update from file");
                        } finally {
                          setImportingId(null);
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={async () => {
                      if (!confirm("Delete this resume?")) return;
                      await api(`/api/resumes/${r.id}`, { method: "DELETE" });
                      await refresh();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
