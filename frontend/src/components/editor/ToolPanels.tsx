import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { AnalyzerReportView } from "../analyzer/AnalyzerReportView";
import type { AnalyzerReport } from "../../types/analyzer";
import { useAuthStore } from "../../store/authStore";
import { useEditorStore } from "../../store/editorStore";
import {
  FREE_COLORS,
  FREE_FONTS,
  FONT_LABELS,
  PREMIUM_FONTS,
  SECTION_LABELS,
  type SectionKey,
} from "../../types/resume";

type Tab = "design" | "layout" | "share" | "ats" | "ai" | "history";

export function ToolPanels() {
  const [tab, setTab] = useState<Tab>("design");
  const tabs: { id: Tab; label: string }[] = [
    { id: "design", label: "Design" },
    { id: "layout", label: "Layout" },
    { id: "share", label: "Share" },
    { id: "ats", label: "ATS" },
    { id: "ai", label: "AI" },
    { id: "history", label: "History" },
  ];
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-full bg-[#efe8dc] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-[background-color,color] duration-200 ${tab === t.id ? "bg-[var(--navy)] text-[var(--cream)]" : "text-[var(--navy)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "design" ? <DesignPanel /> : null}
      {tab === "layout" ? <LayoutPanel /> : null}
      {tab === "share" ? <SharePanel /> : null}
      {tab === "ats" ? <AtsPanel /> : null}
      {tab === "ai" ? <AiPanel /> : null}
      {tab === "history" ? <HistoryPanel /> : null}
    </div>
  );
}

function DesignPanel() {
  const design = useEditorStore((s) => s.design);
  const setDesign = useEditorStore((s) => s.setDesign);
  const premium = useAuthStore((s) => s.user?.isPremium);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Font</p>
        <div className="grid grid-cols-2 gap-2">
          {[...FREE_FONTS, ...PREMIUM_FONTS].map((f) => {
            const locked = PREMIUM_FONTS.includes(f) && !premium;
            return (
              <button
                key={f}
                type="button"
                disabled={locked}
                onClick={() => setDesign({ ...design, fontFamily: f })}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${design.fontFamily === f ? "border-[var(--copper)] bg-[#f8eee6]" : "border-[var(--line)] bg-white"}`}
              >
                {FONT_LABELS[f]}
                {locked ? <span className="block text-[10px] text-[var(--copper)]">Premium</span> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Accent</p>
        <div className="flex flex-wrap gap-2">
          {FREE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDesign({ ...design, accentColor: c })}
              className="h-8 w-8 rounded-full border border-black/10"
              style={{ background: c, outline: design.accentColor === c ? "2px solid #12151c" : undefined }}
            />
          ))}
        </div>
        {premium ? (
          <label className="mt-3 block text-xs">
            Custom color
            <input
              type="color"
              className="ml-2 align-middle"
              value={design.accentColor}
              onChange={(e) => setDesign({ ...design, accentColor: e.target.value })}
            />
          </label>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Custom picker is on <Link to="/premium" className="underline">Premium</Link>.
          </p>
        )}
      </div>
    </div>
  );
}

function LayoutPanel() {
  const content = useEditorStore((s) => s.content);
  const layout = useEditorStore((s) => s.layout);
  const setLayout = useEditorStore((s) => s.setLayout);
  const updateContent = useEditorStore((s) => s.updateContent);
  if (!content) return null;
  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= content.sectionOrder.length) return;
    const order = [...content.sectionOrder];
    const [item] = order.splice(index, 1);
    order.splice(next, 0, item);
    updateContent((c) => ({ ...c, sectionOrder: order }));
  };
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Section order</p>
        <ul className="space-y-2">
          {content.sectionOrder.map((key, i) => (
            <li key={key} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
              <span>{SECTION_LABELS[key as SectionKey] || key}</span>
              <span className="flex gap-1">
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, 1)}>
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <label className="block text-sm">
        Section spacing ({layout.sectionGap}px)
        <input
          type="range"
          min={8}
          max={36}
          value={layout.sectionGap}
          onChange={(e) => setLayout({ ...layout, sectionGap: Number(e.target.value) })}
          className="w-full"
        />
      </label>
      <label className="block text-sm">
        Line height ({layout.lineHeight})
        <input
          type="range"
          min={1.2}
          max={1.8}
          step={0.05}
          value={layout.lineHeight}
          onChange={(e) => setLayout({ ...layout, lineHeight: Number(e.target.value) })}
          className="w-full"
        />
      </label>
      <label className="block text-sm">
        Page padding ({layout.pagePadding}px)
        <input
          type="range"
          min={28}
          max={80}
          value={layout.pagePadding}
          onChange={(e) => setLayout({ ...layout, pagePadding: Number(e.target.value) })}
          className="w-full"
        />
      </label>
    </div>
  );
}

function SharePanel() {
  const resumeId = useEditorStore((s) => s.resumeId);
  const [link, setLink] = useState<{ token: string; isPublic: boolean; revokedAt: string | null; viewCount: number } | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    if (!resumeId) return;
    const data = await api<{ links: typeof link[] }>(`/api/share/${resumeId}`);
    setLink(data.links.find((l) => !l?.revokedAt) || data.links[0] || null);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [resumeId]);

  const url = link ? `${window.location.origin}/share/${link.token}` : "";

  return (
    <div className="space-y-3 text-sm">
      {error ? <p className="text-red-700">{error}</p> : null}
      {link && !link.revokedAt ? (
        <>
          <p className="break-all rounded-xl bg-white p-3">{url}</p>
          <p className="text-[var(--muted)]">{link.viewCount} views · {link.isPublic ? "Public" : "Private"}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={async () => {
                await api(`/api/share/${link.token}`, {
                  method: "PATCH",
                  body: JSON.stringify({ isPublic: !link.isPublic }),
                });
                await refresh();
              }}
            >
              {link.isPublic ? "Make private" : "Make public"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={async () => {
                await api(`/api/share/${link.token}`, { method: "DELETE" });
                await refresh();
              }}
            >
              Revoke
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-copper"
          onClick={async () => {
            try {
              if (!resumeId) return;
              await api(`/api/share/${resumeId}`, { method: "POST" });
              await refresh();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not create link");
            }
          }}
        >
          Generate shareable link
        </button>
      )}
    </div>
  );
}

function AtsPanel() {
  const resumeId = useEditorStore((s) => s.resumeId);
  const [report, setReport] = useState<AnalyzerReport | null>(null);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <textarea
        className="field min-h-20 text-sm"
        placeholder="Optional: paste a job description"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-copper"
        disabled={busy || !resumeId}
        onClick={async () => {
          setBusy(true);
          try {
            setReport(
              await api<AnalyzerReport>("/api/ats/check", {
                method: "POST",
                body: JSON.stringify({ resumeId, jobDescription: jd }),
              })
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Scoring…" : "Analyse ATS score"}
      </button>
      <Link to={resumeId ? `/analyzer?resumeId=${resumeId}` : "/analyzer"} className="block text-xs font-semibold text-[var(--copper-deep)]">
        Open full analyser →
      </Link>
      {report ? <AnalyzerReportView report={report} /> : null}
    </div>
  );
}

function AiPanel() {
  const resumeId = useEditorStore((s) => s.resumeId);
  const content = useEditorStore((s) => s.content);
  const updateContent = useEditorStore((s) => s.updateContent);
  const [jd, setJd] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<{ present: string[]; missing: string[]; matchPercent: number } | null>(null);
  const [scores, setScores] = useState<{ completeness: number; readability: string; note: string } | null>(null);
  const text = content?.experience[0]?.description || content?.summary || "";

  return (
    <div className="space-y-5 text-sm">
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={async () => {
          const data = await api<{ suggestions: string[] }>("/api/ai/summary", {
            method: "POST",
            body: JSON.stringify({ resumeId, content }),
          });
          setSummaries(data.suggestions);
        }}
      >
        Help write summary
      </button>
      {summaries.map((s) => (
        <div key={s} className="card p-3">
          <p>{s}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--copper-deep)]"
            onClick={() => {
              updateContent((c) => ({ ...c, summary: `<p>${s}</p>` }));
              setSummaries([]);
            }}
          >
            Use this summary
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-ink"
        onClick={async () => {
          if (!resumeId) return;
          setScores(await api(`/api/ai/scores/${resumeId}`));
        }}
      >
        Refresh scorecard
      </button>
      {scores ? (
        <div className="card p-3">
          <p className="serif text-2xl">{scores.completeness}%</p>
          <p>Readability: {scores.readability}</p>
          <p className="text-[var(--muted)]">{scores.note}</p>
        </div>
      ) : null}
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={async () => {
          const data = await api<{ suggestions: string[] }>("/api/ai/suggest", {
            method: "POST",
            body: JSON.stringify({ text }),
          });
          setSuggestions(data.suggestions);
        }}
      >
        Suggest better wording
      </button>
      {suggestions.map((s) => (
        <div key={s} className="card p-3">
          <p>{s}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--copper-deep)]"
            onClick={() =>
              updateContent((c) => ({
                ...c,
                experience: c.experience.map((e, i) => (i === 0 ? { ...e, description: `<p>${s}</p>` } : e)),
              }))
            }
          >
            Accept
          </button>
        </div>
      ))}
      <textarea className="field min-h-28" placeholder="Paste a job description" value={jd} onChange={(e) => setJd(e.target.value)} />
      <button
        type="button"
        className="btn btn-sm btn-copper"
        onClick={async () => {
          const data = await api<{ present: string[]; missing: string[]; matchPercent: number }>("/api/ai/keywords", {
            method: "POST",
            body: JSON.stringify({ resumeId, jobDescription: jd }),
          });
          setKeywords(data);
        }}
      >
        Analyze keywords
      </button>
      {keywords ? (
        <div>
          <p className="font-semibold">{keywords.matchPercent}% keyword match</p>
          <p className="mt-2 text-xs uppercase text-[var(--muted)]">Missing</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {keywords.missing.map((k) => (
              <span key={k} className="chip">
                {k}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HistoryPanel() {
  const resumeId = useEditorStore((s) => s.resumeId);
  const load = useEditorStore((s) => s.load);
  const [versions, setVersions] = useState<{ id: string; createdAt: string; label?: string }[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!resumeId) return;
    const data = await api<{ versions: { id: string; createdAt: string; label?: string }[] }>(`/api/resumes/${resumeId}/versions`);
    setVersions(data.versions);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [resumeId]);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-[var(--muted)]">Each save keeps a snapshot. You can also name one before a big edit.</p>
      <div className="flex gap-2">
        <input className="field" placeholder="e.g. Before interview rewrite" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button
          type="button"
          className="btn btn-sm btn-copper"
          disabled={busy || !resumeId}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/api/resumes/${resumeId}/versions`, { method: "POST", body: JSON.stringify({ label }) });
              setLabel("");
              await refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </button>
      </div>
      <ul className="space-y-2">
        {versions.length === 0 ? <li className="text-[var(--muted)]">No snapshots yet — save once to start history.</li> : null}
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <span>
              {v.label ? <span className="font-semibold">{v.label} · </span> : null}
              {new Date(v.createdAt).toLocaleString()}
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--copper-deep)]"
              onClick={async () => {
                const data = await api<{ resume: import("../../types/resume").ResumeDto }>(
                  `/api/resumes/${resumeId}/versions/${v.id}/revert`,
                  { method: "POST" }
                );
                load(data.resume);
                await refresh();
              }}
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
