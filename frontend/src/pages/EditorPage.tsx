import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, downloadExport, parseResumeFile } from "../api/client";
import { EditorForm } from "../components/editor/EditorForm";
import { ToolPanels } from "../components/editor/ToolPanels";
import { PreviewStage, ResumePreview } from "../components/preview/ResumePreview";
import { useEditorStore } from "../store/editorStore";
import type { ResumeDto, TemplateDto } from "../types/resume";

type Pane = "edit" | "preview" | "tools";

export function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = useEditorStore((s) => s.load);
  const save = useEditorStore((s) => s.save);
  const content = useEditorStore((s) => s.content);
  const title = useEditorStore((s) => s.title);
  const templateSlug = useEditorStore((s) => s.templateSlug);
  const templateId = useEditorStore((s) => s.templateId);
  const setTemplate = useEditorStore((s) => s.setTemplate);
  const design = useEditorStore((s) => s.design);
  const layout = useEditorStore((s) => s.layout);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const lastSaved = useEditorStore((s) => s.lastSaved);
  const resumeId = useEditorStore((s) => s.resumeId);
  const setContent = useEditorStore((s) => s.setContent);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"pdf" | "ppt" | null>(null);
  const [toast, setToast] = useState("");
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [pane, setPane] = useState<Pane>("edit");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<{ resume: ResumeDto }>(`/api/resumes/${id}`)
      .then((data) => {
        if (!cancelled) load(data.resume);
      })
      .catch(() => {
        if (!cancelled) navigate("/resumes");
      });
    api<{ templates: TemplateDto[] }>("/api/templates")
      .then((data) => {
        if (!cancelled) setTemplates(data.templates);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, load, navigate]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      save().catch((err) => setError(err instanceof ApiError ? err.message : "Save failed"));
    }, 1000);
    return () => clearTimeout(t);
  }, [dirty, content, title, templateId, design, save]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleExport(format: "pdf" | "ppt") {
    setError("");
    try {
      if (dirty) await save();
      if (!resumeId) return;
      setExporting(format);
      await downloadExport(resumeId, format, title);
      setToast(format === "pdf" ? "PDF exported" : "PowerPoint exported");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  if (!content) {
    return <div className="flex min-h-[50vh] items-center justify-center text-[var(--muted)]">Opening editor…</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="workspace-bar">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Link to="/resumes" className="text-sm text-[var(--muted)]">
            ← Library
          </Link>
          <select
            value={templateId}
            onChange={(e) => {
              const next = templates.find((t) => t.id === e.target.value);
              if (next) setTemplate(next.id, next.slug);
            }}
            className="field max-w-48 py-1.5"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isPremium ? " · Premium" : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--muted)]">
            {saving ? "Saving…" : dirty ? "Unsaved" : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Saved"}
          </span>
          <div className="pane-toggle" role="tablist" aria-label="Editor view">
            {(
              [
                ["edit", "Edit"],
                ["preview", "Preview"],
                ["tools", "Tools"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={pane === id ? "active" : ""} onClick={() => setPane(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-sm btn-ghost cursor-pointer">
            Fill from file
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const data = await parseResumeFile(file);
                  setContent(data.content);
                  setToast("Fields filled from your file");
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Could not read that resume");
                }
              }}
            />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!dirty || saving} onClick={() => save().catch((err) => setError(err instanceof ApiError ? err.message : "Save failed"))}>
            Save
          </button>
          <button type="button" className="btn btn-sm btn-copper" disabled={!!exporting} onClick={() => handleExport("pdf")}>
            {exporting === "pdf" ? (
              <>
                <span className="spinner" aria-hidden /> Exporting…
              </>
            ) : (
              "Export PDF"
            )}
          </button>
          <button type="button" className="btn btn-sm btn-outline" disabled={!!exporting} onClick={() => handleExport("ppt")}>
            {exporting === "ppt" ? "Exporting…" : "Export PPT"}
          </button>
        </div>
      </div>
      {error ? <p className="form-error mx-4 mt-3">{error}</p> : null}
      <div className="editor-grid grid flex-1 xl:grid-cols-[minmax(320px,34%)_1fr_320px]">
        <div className={`editor-pane overflow-y-auto border-r border-[var(--line)] bg-[var(--cream)] p-4 sm:p-6 ${pane === "edit" ? "active" : ""}`}>
          <EditorForm />
        </div>
        <div className={`editor-pane overflow-auto bg-[#e8e0d4] p-4 sm:p-6 ${pane === "preview" ? "active" : ""}`}>
          <PreviewStage>
            <ResumePreview content={content} slug={templateSlug} accentColor={design.accentColor} fontFamily={design.fontFamily} layout={layout} />
          </PreviewStage>
        </div>
        <div className={`editor-pane overflow-y-auto border-l border-[var(--line)] bg-[var(--paper)] p-5 ${pane === "tools" ? "active" : ""}`}>
          <ToolPanels />
        </div>
      </div>
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
