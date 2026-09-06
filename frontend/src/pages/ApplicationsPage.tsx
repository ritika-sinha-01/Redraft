import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";

export type ApplicationDto = {
  id: string;
  resumeId: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  status: "SAVED" | "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED" | string;
  notes: string;
  followUpAt: string | null;
  jobDescription: string;
  coverLetterId: string | null;
  createdAt: string;
  updatedAt: string;
  resume?: { title: string };
};

const STATUSES = [
  { id: "SAVED", label: "Saved" },
  { id: "APPLIED", label: "Applied" },
  { id: "INTERVIEW", label: "Interview" },
  { id: "OFFER", label: "Offer" },
  { id: "REJECTED", label: "Rejected" },
] as const;

function dateInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ApplicationsPage() {
  const [params] = useSearchParams();
  const highlight = params.get("highlight") || "";
  const [apps, setApps] = useState<ApplicationDto[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api<{ applications: ApplicationDto[] }>("/api/jobs/applications");
    setApps(data.applications);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load applications"))
      .finally(() => setLoading(false));
  }, []);

  async function patch(id: string, body: Partial<Pick<ApplicationDto, "status" | "notes" | "followUpAt">>) {
    setError("");
    try {
      const data = await api<{ application: ApplicationDto }>(`/api/jobs/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setApps((list) => list.map((a) => (a.id === id ? data.application : a)));
      setMsg("Saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update that application");
    }
  }

  const visible = useMemo(
    () => (filter === "ALL" ? apps : apps.filter((a) => a.status === filter)),
    [apps, filter]
  );
  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: apps.length };
    for (const s of STATUSES) next[s.id] = apps.filter((a) => a.status === s.id).length;
    return next;
  }, [apps]);

  return (
    <div className="page bg-[var(--cream)]">
      <p className="chip">Tracker</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Applications</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Saved, applied, interview, offer, rejected. Add a note and a follow-up date so nothing sits.
      </p>
      {error ? <p className="form-error mt-4 max-w-xl">{error}</p> : null}
      {msg ? <p className="mt-3 text-sm text-emerald-800">{msg}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" className={`btn btn-sm ${filter === "ALL" ? "btn-copper" : "btn-ghost"}`} onClick={() => setFilter("ALL")}>
          All · {counts.ALL || 0}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn btn-sm ${filter === s.id ? "btn-copper" : "btn-ghost"}`}
            onClick={() => setFilter(s.id)}
          >
            {s.label} · {counts[s.id] || 0}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-8 text-[var(--muted)]">Loading…</p> : null}
      {!loading && visible.length === 0 ? (
        <div className="card mx-auto mt-10 max-w-lg p-10 text-center">
          <h2 className="serif text-2xl">Nothing here yet</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Tailor a role on the jobs page, or save an application when you apply.</p>
          <Link to="/jobs" className="btn btn-copper mt-6">
            Open jobs
          </Link>
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {visible.map((a) => (
          <article key={a.id} className={`card p-5 ${highlight === a.id ? "card-selected" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="serif text-2xl">{a.jobTitle}</h2>
                <p className="text-sm text-[var(--muted)]">
                  {a.company}
                  {a.resume?.title ? ` · ${a.resume.title}` : ""}
                </p>
              </div>
              <select
                className="field w-auto"
                value={a.status}
                onChange={(e) => void patch(a.id, { status: e.target.value })}
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px]">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Notes
                <textarea
                  className="field mt-1 min-h-20"
                  defaultValue={a.notes}
                  placeholder="Recruiter name, what you sent, what they asked"
                  onBlur={(e) => {
                    if (e.target.value !== a.notes) void patch(a.id, { notes: e.target.value });
                  }}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Follow up
                <input
                  className="field mt-1"
                  type="date"
                  value={dateInput(a.followUpAt)}
                  onChange={(e) => void patch(a.id, { followUpAt: e.target.value || null })}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn btn-sm btn-ghost" to={`/editor/${a.resumeId}`}>
                Resume
              </Link>
              <Link className="btn btn-sm btn-ghost" to={`/analyzer?resumeId=${a.resumeId}`}>
                ATS
              </Link>
              {a.coverLetterId ? (
                <Link className="btn btn-sm btn-ghost" to={`/cover-letters/${a.coverLetterId}`}>
                  Cover letter
                </Link>
              ) : null}
              {a.jobUrl ? (
                <a className="btn btn-sm btn-outline" href={a.jobUrl} target="_blank" rel="noreferrer">
                  Posting
                </a>
              ) : null}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={async () => {
                  if (!window.confirm("Remove this application?")) return;
                  await api(`/api/jobs/applications/${a.id}`, { method: "DELETE" });
                  setApps((list) => list.filter((x) => x.id !== a.id));
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
