import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { ResumeDto } from "../types/resume";

export function CommunityPage() {
  const premium = useAuthStore((s) => s.user?.isPremium);
  const [resumes, setResumes] = useState<ResumeDto[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [queue, setQueue] = useState<{ id: string; title: string; owner: string; preview: string }[]>([]);
  const [mine, setMine] = useState<{
    received: { id: string; feedback: string; status: string; isProfessional: boolean; resume: { title: string } }[];
  }>({ received: [] });
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const [r, q, m] = await Promise.all([
      api<{ resumes: ResumeDto[] }>("/api/resumes"),
      api<{ reviews: typeof queue }>("/api/community/queue"),
      api<{ received: typeof mine.received }>("/api/community/mine"),
    ]);
    setResumes(r.resumes);
    setQueue(q.reviews);
    setMine(m);
    if (!resumeId && r.resumes[0]) setResumeId(r.resumes[0].id);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <p className="chip">Community</p>
      <h1 className="serif mt-3 text-4xl">Peer eyes, then expert eyes</h1>
      {msg ? <p className="mt-3 text-emerald-800">{msg}</p> : null}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="serif text-2xl">Submit yours</h2>
          <select className="field mt-4" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={async () => {
                await api("/api/community/submit", { method: "POST", body: JSON.stringify({ resumeId }) });
                setMsg("Submitted for peer review.");
                await load();
              }}
            >
              Ask peers
            </button>
            <button
              type="button"
              className="btn btn-copper"
              onClick={async () => {
                try {
                  await api("/api/community/professional", { method: "POST", body: JSON.stringify({ resumeId }) });
                  setMsg("Expert notes are in.");
                  await load();
                } catch (err) {
                  setMsg(err instanceof ApiError ? err.message : "Premium required");
                }
              }}
            >
              {premium ? "Professional review" : "Professional (Premium)"}
            </button>
          </div>
          <h3 className="mt-8 text-sm font-semibold uppercase text-[var(--muted)]">Feedback received</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {mine.received.map((r) => (
              <li key={r.id} className="rounded-xl bg-[var(--parchment)] p-3">
                <div className="text-xs uppercase">{r.isProfessional ? "Expert" : "Peer"} · {r.status}</div>
                <div className="font-medium">{r.resume.title}</div>
                <p className="mt-1">{r.feedback || "Waiting for comments."}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="serif text-2xl">Review others</h2>
          <ul className="mt-4 space-y-4">
            {queue.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--line)] p-4">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-[var(--muted)]">{item.owner}</p>
                <p className="mt-2 text-sm">{item.preview}</p>
                <textarea
                  className="field mt-3 min-h-20"
                  placeholder="One honest, specific note"
                  value={feedback[item.id] || ""}
                  onChange={(e) => setFeedback((f) => ({ ...f, [item.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-copper mt-2"
                  onClick={async () => {
                    await api(`/api/community/${item.id}/feedback`, {
                      method: "POST",
                      body: JSON.stringify({ feedback: feedback[item.id] }),
                    });
                    setMsg("Feedback sent.");
                    await load();
                  }}
                >
                  Send feedback
                </button>
              </li>
            ))}
            {queue.length === 0 ? <p className="text-[var(--muted)]">Queue is empty. Check back after someone submits.</p> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
