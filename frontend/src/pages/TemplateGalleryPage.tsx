import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError, createResumeFromImport, peekImportedContent, takeImportedContent } from "../api/client";
import { ImportResumePanel } from "../components/import/ImportResumePanel";
import { ResumeDocument } from "../templates";
import { SAMPLE_CONTENT, type ResumeContent, type ResumeDto, type TemplateDto } from "../types/resume";
import { useAuthStore } from "../store/authStore";

export function TemplateGalleryPage() {
  const navigate = useNavigate();
  const premium = useAuthStore((s) => s.user?.isPremium);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [library, setLibrary] = useState<ResumeDto[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<ResumeContent | null>(null);
  const [importTitle, setImportTitle] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [sourceResumeId, setSourceResumeId] = useState<string | null>(null);

  useEffect(() => {
    const stashed = peekImportedContent();
    if (stashed) {
      setImported(stashed.content);
      setImportTitle(stashed.title);
    }
    api<{ templates: TemplateDto[] }>("/api/templates")
      .then((data) => setTemplates(data.templates))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load templates"));
    api<{ resumes: ResumeDto[] }>("/api/resumes")
      .then((data) => setLibrary(data.resumes))
      .catch(() => undefined);
  }, []);

  async function selectTemplate(template: TemplateDto) {
    setSelectedId(template.id);
    if (template.isPremium && !premium) {
      navigate("/premium");
      return;
    }
    setBusyId(template.id);
    try {
      const stashed = imported ? { content: imported, title: importTitle } : takeImportedContent();
      const data = await api<{ resume: ResumeDto }>("/api/resumes", {
        method: "POST",
        body: JSON.stringify({
          templateId: template.id,
          title: stashed?.title || `${template.name} Resume`,
          content: stashed?.content,
          sourceResumeId: stashed?.content ? undefined : sourceResumeId,
        }),
      });
      sessionStorage.removeItem("resume-analysis.import");
      navigate(`/editor/${data.resume.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create resume");
      setBusyId(null);
    }
  }

  return (
    <div className="page bg-[var(--cream)]">
      <p className="chip">Gallery</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Twelve starting points</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Upload an existing resume first if you have one — then pick a layout. Your details fill in automatically.
      </p>
      {error ? <p className="form-error mt-4 max-w-xl">{error}</p> : null}

      <div className="mt-8 max-w-2xl">
        <ImportResumePanel
          existingResumes={library}
          onParsed={(content, nextWarnings, titleHint) => {
            setImported(content);
            setImportTitle(titleHint || "Imported resume");
            setWarnings(nextWarnings);
            setSourceResumeId(null);
          }}
          onUseExisting={(resume) => {
            setImported(resume.content);
            setImportTitle(`${resume.title} (copy)`);
            setWarnings([]);
            setSourceResumeId(resume.id);
          }}
        />
        {imported ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-[var(--copper-deep)]">
              Ready to auto-fill{importTitle ? ` “${importTitle}”` : ""}. Choose a template, or open the editor now.
              {warnings.length ? ` ${warnings[0]}` : ""}
            </p>
            <button
              type="button"
              className="btn btn-sm btn-copper"
              disabled={!!busyId}
              onClick={async () => {
                setBusyId("import");
                try {
                  const data = await createResumeFromImport(imported, importTitle);
                  sessionStorage.removeItem("resume-analysis.import");
                  navigate(`/editor/${data.resume.id}`);
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Could not create resume");
                  setBusyId(null);
                }
              }}
            >
              {busyId === "import" ? "Opening…" : "Open editor now"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {templates.map((t) => {
          const selected = selectedId === t.id;
          return (
            <div key={t.id} className={`card card-interactive relative overflow-hidden ${selected ? "card-selected" : ""}`}>
              {selected ? (
                <span className="check-badge" aria-hidden>
                  ✓
                </span>
              ) : null}
              <div className="thumb-frame">
                <div className="origin-top-left scale-[0.3]">
                  <div className="w-[794px]">
                    <ResumeDocument content={imported || SAMPLE_CONTENT} slug={t.slug} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <h2 className="serif text-xl">{t.name}</h2>
                  <p className="text-xs text-[var(--muted)]">{t.isPremium ? "Premium" : "Free"}</p>
                </div>
                <button type="button" className="btn btn-sm btn-copper" disabled={busyId === t.id} onClick={() => selectTemplate(t)}>
                  {busyId === t.id ? "Opening…" : t.isPremium && !premium ? "Upgrade" : imported ? "Use + fill" : "Select"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
