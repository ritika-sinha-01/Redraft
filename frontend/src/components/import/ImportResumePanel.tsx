import { useRef, useState } from "react";
import { ApiError, parseResumeFile, api } from "../../api/client";
import type { ResumeContent, ResumeDto } from "../../types/resume";

export function ImportResumePanel({
  heading = "Have a resume already?",
  subtitle = "Upload a PDF, Word, or text file. We’ll fill the form so you can pick a template and keep editing.",
  onParsed,
  existingResumes,
  onUseExisting,
}: {
  heading?: string;
  subtitle?: string;
  onParsed: (content: ResumeContent, warnings: string[], titleHint?: string) => void | Promise<void>;
  existingResumes?: ResumeDto[];
  onUseExisting?: (resume: ResumeDto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paste, setPaste] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = await parseResumeFile(file);
      await onParsed(data.content, data.warnings, file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read that resume. Try a .docx, .txt, or paste the text.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handlePaste() {
    if (!paste.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ content: ResumeContent; warnings: string[] }>("/api/resumes/parse", {
        method: "POST",
        body: JSON.stringify({ text: paste }),
      });
      await onParsed(data.content, data.warnings, "Imported resume");
      setPaste("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not parse that text");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="serif text-2xl">{heading}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      {error ? <p className="form-error mt-3">{error}</p> : null}
      <div
        className="mt-4 cursor-pointer rounded-[18px] border border-dashed border-[var(--copper)] bg-[var(--paper)] px-4 py-8 text-center transition-[background-color,box-shadow] duration-200 hover:bg-[#f8eee6]"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFile(e.dataTransfer.files[0]);
        }}
      >
        <p className="font-semibold text-[var(--copper-deep)]">{busy ? "Reading resume…" : "Drop a file or browse"}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">PDF, Word (.docx), or .txt · under 6 MB. Scanned image PDFs: paste the text instead.</p>
        <button
          type="button"
          className="btn btn-sm btn-copper mt-4"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Or paste the text
        <textarea
          className="field mt-1 min-h-24"
          placeholder="Paste your resume here"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
      </label>
      <button type="button" className="btn btn-outline mt-3" disabled={busy || !paste.trim()} onClick={() => void handlePaste()}>
        Fill from pasted text
      </button>
      {existingResumes?.length && onUseExisting ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Or copy a saved resume
          <select
            className="field mt-1"
            defaultValue=""
            onChange={(e) => {
              const resume = existingResumes.find((r) => r.id === e.target.value);
              if (resume) onUseExisting(resume);
              e.target.value = "";
            }}
          >
            <option value="">Choose one…</option>
            {existingResumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
