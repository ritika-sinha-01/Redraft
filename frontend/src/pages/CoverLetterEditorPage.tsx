import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, downloadCoverExport } from "../api/client";
import { CoverLetterPreview } from "../components/cover/CoverLetterPreview";
import { LlmSettingsPanel } from "../components/ai/LlmSettingsPanel";
import type { CoverLetterContent, CoverLetterDesign, CoverLetterDto } from "../types/coverLetter";
import type { ResumeDto } from "../types/resume";

const ACCENTS = ["#c45c26", "#12151c", "#1f3a4c", "#0f766e", "#7c3aed", "#be123c"];

export function CoverLetterEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [letter, setLetter] = useState<CoverLetterDto | null>(null);
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api<{ letter: CoverLetterDto }>(`/api/cover-letters/${id}`),
      api<{ resumes: ResumeDto[] }>("/api/resumes"),
    ])
      .then(([l, r]) => {
        setLetter(l.letter);
        setResumes(r.resumes);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not open that letter"));
  }, [id]);

  const resume = useMemo(
    () => resumes.find((r) => r.id === letter?.resumeId),
    [resumes, letter?.resumeId]
  );

  function patchContent(partial: Partial<CoverLetterContent>) {
    setLetter((prev) => (prev ? { ...prev, content: { ...prev.content, ...partial } } : prev));
  }

  function patchDesign(partial: Partial<CoverLetterDesign>) {
    setLetter((prev) => (prev ? { ...prev, design: { ...prev.design, ...partial } } : prev));
  }

  function setParagraph(index: number, value: string) {
    setLetter((prev) => {
      if (!prev) return prev;
      const paragraphs = [...prev.content.paragraphs];
      paragraphs[index] = value;
      return { ...prev, content: { ...prev.content, paragraphs } };
    });
  }

  async function save() {
    if (!letter) return false;
    setBusy("save");
    setError("");
    try {
      const data = await api<{ letter: CoverLetterDto }>(`/api/cover-letters/${letter.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: letter.title,
          company: letter.company,
          role: letter.role,
          jobDescription: letter.jobDescription,
          resumeId: letter.resumeId,
          content: letter.content,
          design: letter.design,
        }),
      });
      setLetter(data.letter);
      setSavedAt(new Date().toLocaleTimeString());
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function regenerate() {
    if (!letter) return;
    setError("");
    const ok = await save();
    if (!ok) return;
    setBusy("regen");
    try {
      const data = await api<{ letter: CoverLetterDto }>(`/api/cover-letters/${letter.id}/regenerate`, {
        method: "POST",
      });
      setLetter(data.letter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not regenerate");
    } finally {
      setBusy("");
    }
  }

  async function download(format: "pdf" | "docx") {
    if (!letter) return;
    setError("");
    const ok = await save();
    if (!ok) return;
    setBusy(format);
    try {
      await downloadCoverExport(letter.id, format, letter.title);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not download");
    } finally {
      setBusy("");
    }
  }

  if (!letter) {
    return (
      <div className="page">
        {error ? <p className="form-error">{error}</p> : <p className="text-[var(--muted)]">Loading…</p>}
      </div>
    );
  }

  return (
    <div className="bg-[var(--cream)]">
      <div className="workspace-bar">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/cover-letters" className="text-sm text-[var(--muted)]">
            All letters
          </Link>
          <input
            className="field max-w-xs"
            value={letter.title}
            onChange={(e) => setLetter({ ...letter, title: e.target.value })}
          />
          {savedAt ? <span className="text-xs text-[var(--muted)]">Saved {savedAt}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-ghost" disabled={Boolean(busy)} onClick={() => void save()}>
            Save
          </button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={Boolean(busy)} onClick={() => void regenerate()}>
            {busy === "regen" ? "Rewriting…" : "Rewrite with AI"}
          </button>
          <button type="button" className="btn btn-sm btn-outline" disabled={Boolean(busy)} onClick={() => void download("docx")}>
            Word
          </button>
          <button type="button" className="btn btn-sm btn-copper" disabled={Boolean(busy)} onClick={() => void download("pdf")}>
            PDF
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={async () => {
              if (!confirm("Delete this cover letter?")) return;
              await api(`/api/cover-letters/${letter.id}`, { method: "DELETE" });
              navigate("/cover-letters");
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {error ? <p className="form-error mx-6 mt-4 max-w-xl">{error}</p> : null}

      <div className="editor-grid cover-editor-grid grid xl:grid-cols-[minmax(340px,420px)_1fr]">
        <div className="space-y-5 p-6">
          <div className="section-card space-y-3">
            <h2 className="section-heading serif text-xl">Job details</h2>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Resume
              <select
                className="field mt-1"
                value={letter.resumeId || ""}
                onChange={(e) => setLetter({ ...letter, resumeId: e.target.value || null })}
              >
                <option value="">None</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="field"
                value={letter.company}
                onChange={(e) => setLetter({ ...letter, company: e.target.value })}
                placeholder="Company"
              />
              <input
                className="field"
                value={letter.role}
                onChange={(e) => setLetter({ ...letter, role: e.target.value })}
                placeholder="Role"
              />
            </div>
            <textarea
              className="field"
              rows={5}
              value={letter.jobDescription}
              onChange={(e) => setLetter({ ...letter, jobDescription: e.target.value })}
              placeholder="Job description"
            />
          </div>

          <div className="section-card space-y-3">
            <h2 className="section-heading serif text-xl">Letter</h2>
            <input
              className="field"
              value={letter.content.senderName}
              onChange={(e) => patchContent({ senderName: e.target.value })}
              placeholder="Your name"
            />
            <input
              className="field"
              value={letter.content.greeting}
              onChange={(e) => patchContent({ greeting: e.target.value })}
              placeholder="Greeting"
            />
            {letter.content.paragraphs.map((p, i) => (
              <textarea
                key={i}
                className="field"
                rows={4}
                value={p}
                onChange={(e) => setParagraph(i, e.target.value)}
              />
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => patchContent({ paragraphs: [...letter.content.paragraphs, ""] })}
              >
                Add paragraph
              </button>
              {letter.content.paragraphs.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => patchContent({ paragraphs: letter.content.paragraphs.slice(0, -1) })}
                >
                  Remove last
                </button>
              ) : null}
            </div>
            <input
              className="field"
              value={letter.content.signoff}
              onChange={(e) => patchContent({ signoff: e.target.value })}
              placeholder="Sign-off"
            />
          </div>

          <div className="section-card space-y-3">
            <h2 className="section-heading serif text-xl">Layout and style</h2>
            <div className="flex flex-wrap gap-2">
              {(["classic", "modern", "compact"] as const).map((layout) => (
                <button
                  key={layout}
                  type="button"
                  className={`btn btn-sm ${letter.design.layout === layout ? "btn-copper" : "btn-ghost"}`}
                  onClick={() => patchDesign({ layout })}
                >
                  {layout}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["georgia", "garamond", "segoe"] as const).map((fontFamily) => (
                <button
                  key={fontFamily}
                  type="button"
                  className={`btn btn-sm ${letter.design.fontFamily === fontFamily ? "btn-ink" : "btn-ghost"}`}
                  onClick={() => patchDesign({ fontFamily })}
                >
                  {fontFamily}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((accentColor) => (
                <button
                  key={accentColor}
                  type="button"
                  className="color-swatch"
                  style={{ background: accentColor, outline: letter.design.accentColor === accentColor ? "2px solid #12151c" : undefined }}
                  aria-label={accentColor}
                  onClick={() => patchDesign({ accentColor })}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(["left", "center"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  className={`btn btn-sm ${letter.design.align === align ? "btn-copper" : "btn-ghost"}`}
                  onClick={() => patchDesign({ align })}
                >
                  {align}
                </button>
              ))}
              {(["comfortable", "tight"] as const).map((spacing) => (
                <button
                  key={spacing}
                  type="button"
                  className={`btn btn-sm ${letter.design.spacing === spacing ? "btn-copper" : "btn-ghost"}`}
                  onClick={() => patchDesign({ spacing })}
                >
                  {spacing}
                </button>
              ))}
            </div>
          </div>
          <LlmSettingsPanel compact />
        </div>

        <div className="cover-preview-pane">
          <CoverLetterPreview
            content={letter.content}
            design={letter.design}
            company={letter.company}
            role={letter.role}
            email={resume?.content.personal.email}
            phone={resume?.content.personal.phone}
            location={resume?.content.personal.location}
          />
        </div>
      </div>
    </div>
  );
}
