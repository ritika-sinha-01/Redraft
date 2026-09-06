import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, downloadExport } from "../api/client";
import { LlmSettingsPanel } from "../components/ai/LlmSettingsPanel";
import type { ResumeDto } from "../types/resume";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  pdfResumeId?: string;
  pdfTitle?: string;
}

export function AiAssistantPage() {
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    refreshResumes();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  async function refreshResumes() {
    try {
      const d = await api<{ resumes: ResumeDto[] }>("/api/resumes");
      setResumes(d.resumes);
      setResumeId((current) => current || d.resumes[0]?.id || "");
    } catch {
      undefined;
    }
  }

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: trimmed }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        reply: string;
        downloadPdf?: boolean;
        resumeId?: string;
        title?: string;
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ messages: next, resumeId: resumeId || undefined }),
      });
      const pdfResumeId = data.downloadPdf ? data.resumeId : undefined;
      setTurns([
        ...next,
        { role: "assistant", content: data.reply, pdfResumeId, pdfTitle: data.title },
      ]);
      if (pdfResumeId) {
        setResumeId(pdfResumeId);
        await downloadExport(pdfResumeId, "pdf", data.title || "resume");
        await refreshResumes();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The assistant could not reply.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    await sendText(input);
  }

  return (
    <div className="page bg-[var(--cream)]">
      <p className="chip">AI assistant</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Ask the assistant</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Say “make my resume and send a PDF” — it will polish the selected resume and download it. No API key needed.
      </p>
      {error ? <p className="form-error mt-4 max-w-xl">{error}</p> : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <LlmSettingsPanel />
          <div className="card space-y-3 p-5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Resume for context
              <select className="field mt-1" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                <option value="">Create a new one</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-sm btn-copper w-full"
              disabled={busy}
              onClick={() => void sendText("Make my resume and send it as a PDF")}
            >
              Make resume PDF
            </button>
            <button type="button" className="btn btn-sm btn-ghost w-full" onClick={() => setTurns([])}>
              New chat
            </button>
          </div>
        </aside>

        <section className="card flex min-h-[520px] flex-col p-5">
          <div className="chat-thread">
            {turns.length === 0 ? (
              <p className="m-auto max-w-md text-center text-sm text-[var(--muted)]">
                Try “Make my resume and send a PDF” or “What changes should I make?”
              </p>
            ) : null}
            {turns.map((t, i) => (
              <div key={i} className={`chat-bubble ${t.role === "user" ? "chat-user" : "chat-ai"}`}>
                <div>{t.content}</div>
                {t.pdfResumeId ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-copper"
                      onClick={() => void downloadExport(t.pdfResumeId!, "pdf", t.pdfTitle || "resume")}
                    >
                      Download PDF again
                    </button>
                    <Link className="btn btn-sm btn-ghost" to={`/editor/${t.pdfResumeId}`}>
                      Open in editor
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <div className="chat-bubble chat-ai">Working on your resume…</div> : null}
            <div ref={endRef} />
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              className="field"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Make my resume and send a PDF"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <button className="btn btn-copper self-end" type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
