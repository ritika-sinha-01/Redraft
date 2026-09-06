import { FormEvent, useState } from "react";
import { api, ApiError } from "../../api/client";
import { useEditorStore } from "../../store/editorStore";
import type { AwardItem, EducationItem, ExperienceItem, ProjectItem, SectionKey } from "../../types/resume";
import { SECTION_LABELS } from "../../types/resume";
import { RichText } from "./RichText";

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
      {label}
      <input className="field mt-1" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function EditorForm() {
  const content = useEditorStore((s) => s.content);
  const title = useEditorStore((s) => s.title);
  const setTitle = useEditorStore((s) => s.setTitle);
  const updateContent = useEditorStore((s) => s.updateContent);
  const resumeId = useEditorStore((s) => s.resumeId);
  const [skillDraft, setSkillDraft] = useState("");
  const [summaryHelp, setSummaryHelp] = useState<string[]>([]);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  if (!content) return null;

  const toggleSection = (key: SectionKey) => {
    updateContent((c) => {
      const on = !c.sectionVisibility[key];
      const order = on && !c.sectionOrder.includes(key) ? [...c.sectionOrder, key] : c.sectionOrder;
      return { ...c, sectionVisibility: { ...c.sectionVisibility, [key]: on }, sectionOrder: order };
    });
  };

  const addSkill = (e?: FormEvent) => {
    e?.preventDefault();
    const value = skillDraft.trim();
    if (!value) return;
    updateContent((c) => ({ ...c, skills: c.skills.includes(value) ? c.skills : [...c.skills, value] }));
    setSkillDraft("");
  };

  return (
    <div className="space-y-5 pb-20">
      <section className="section-card">
        <h2 className="serif section-heading text-lg">Document</h2>
        <Field label="Resume title" value={title} onChange={setTitle} />
      </section>

      <section className="section-card">
        <h2 className="serif section-heading text-lg">Contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" value={content.personal.fullName} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, fullName: v } }))} />
          <Field label="Email" value={content.personal.email} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, email: v } }))} />
          <Field label="Phone" value={content.personal.phone} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, phone: v } }))} />
          <Field label="Location" value={content.personal.location} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, location: v } }))} />
          <Field label="LinkedIn" value={content.personal.linkedin} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, linkedin: v } }))} />
          <Field label="Website" value={content.personal.website} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, website: v } }))} />
          <Field label="Portfolio link" value={content.personal.portfolioUrl} onChange={(v) => updateContent((c) => ({ ...c, personal: { ...c.personal, portfolioUrl: v } }))} />
        </div>
      </section>

      <section className="section-card">
        <h2 className="serif section-heading text-lg">Sections</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`btn btn-sm ${content.sectionVisibility[key] !== false ? "btn-ink" : "btn-ghost"}`}
              onClick={() => toggleSection(key)}
            >
              {content.sectionVisibility[key] !== false ? "−" : "+"} {SECTION_LABELS[key]}
            </button>
          ))}
        </div>
      </section>

      {content.sectionVisibility.summary !== false ? (
        <section className="section-card">
          <div className="section-heading mb-4 flex flex-wrap items-center justify-between gap-2 border-b-0 pb-0">
            <h2 className="serif mb-0 border-0 pb-0 text-lg">Summary</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={summaryBusy}
              onClick={async () => {
                setSummaryBusy(true);
                setSummaryError("");
                try {
                  const data = await api<{ suggestions: string[] }>("/api/ai/summary", {
                    method: "POST",
                    body: JSON.stringify({ resumeId, content }),
                  });
                  setSummaryHelp(data.suggestions);
                } catch (err) {
                  setSummaryError(err instanceof ApiError ? err.message : "Could not write a summary");
                } finally {
                  setSummaryBusy(false);
                }
              }}
            >
              {summaryBusy ? "Writing…" : "Help write summary"}
            </button>
          </div>
          <div className="mb-4 border-b-2 border-[var(--copper)]" />
          <RichText value={content.summary} onChange={(html) => updateContent((c) => ({ ...c, summary: html }))} />
          {summaryError ? <p className="field-hint">{summaryError}</p> : null}
          {summaryHelp.length ? (
            <div className="mt-3 space-y-2">
              {summaryHelp.map((s) => (
                <div key={s} className="card p-3">
                  <p className="text-sm">{s}</p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-[var(--copper-deep)]"
                    onClick={() => {
                      updateContent((c) => ({ ...c, summary: `<p>${s}</p>` }));
                      setSummaryHelp([]);
                    }}
                  >
                    Use this summary
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {content.sectionVisibility.experience !== false ? (
        <section className="section-card">
          <h2 className="serif section-heading text-lg">Experience</h2>
          <div className="space-y-4">
            {content.experience.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label="Delete experience"
                    onClick={() => updateContent((c) => ({ ...c, experience: c.experience.filter((e) => e.id !== item.id) }))}
                  >
                    ×
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title" value={item.title} onChange={(v) => updateContent((c) => ({ ...c, experience: c.experience.map((e) => (e.id === item.id ? { ...e, title: v } : e)) }))} />
                  <Field label="Company" value={item.company} onChange={(v) => updateContent((c) => ({ ...c, experience: c.experience.map((e) => (e.id === item.id ? { ...e, company: v } : e)) }))} />
                  <Field label="Location" value={item.location} onChange={(v) => updateContent((c) => ({ ...c, experience: c.experience.map((e) => (e.id === item.id ? { ...e, location: v } : e)) }))} />
                  <Field label="Start" value={item.startDate} onChange={(v) => updateContent((c) => ({ ...c, experience: c.experience.map((e) => (e.id === item.id ? { ...e, startDate: v } : e)) }))} />
                  <Field label="End" value={item.endDate} onChange={(v) => updateContent((c) => ({ ...c, experience: c.experience.map((e) => (e.id === item.id ? { ...e, endDate: v } : e)) }))} />
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.current}
                      onChange={(e) =>
                        updateContent((c) => ({
                          ...c,
                          experience: c.experience.map((x) => (x.id === item.id ? { ...x, current: e.target.checked } : x)),
                        }))
                      }
                    />
                    Current role
                  </label>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Responsibilities</span>
                  <div className="mt-1">
                    <RichText
                      value={item.description}
                      onChange={(html) =>
                        updateContent((c) => ({
                          ...c,
                          experience: c.experience.map((x) => (x.id === item.id ? { ...x, description: html } : x)),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn-add mt-4"
            onClick={() => {
              const item: ExperienceItem = {
                id: crypto.randomUUID(),
                company: "",
                title: "",
                location: "",
                startDate: "",
                endDate: "",
                current: false,
                description: "",
              };
              updateContent((c) => ({ ...c, experience: [...c.experience, item] }));
            }}
          >
            + Add role
          </button>
        </section>
      ) : null}

      {content.sectionVisibility.education !== false ? (
        <section className="section-card">
          <h2 className="serif section-heading text-lg">Education</h2>
          {content.education.map((item) => (
            <div key={item.id} className="card mb-3 p-4">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="Delete education"
                  onClick={() => updateContent((c) => ({ ...c, education: c.education.filter((e) => e.id !== item.id) }))}
                >
                  ×
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="School" value={item.school} onChange={(v) => updateContent((c) => ({ ...c, education: c.education.map((e) => (e.id === item.id ? { ...e, school: v } : e)) }))} />
                <Field label="Degree" value={item.degree} onChange={(v) => updateContent((c) => ({ ...c, education: c.education.map((e) => (e.id === item.id ? { ...e, degree: v } : e)) }))} />
                <Field label="Field" value={item.field} onChange={(v) => updateContent((c) => ({ ...c, education: c.education.map((e) => (e.id === item.id ? { ...e, field: v } : e)) }))} />
                <Field label="Start" value={item.startDate} onChange={(v) => updateContent((c) => ({ ...c, education: c.education.map((e) => (e.id === item.id ? { ...e, startDate: v } : e)) }))} />
                <Field label="End" value={item.endDate} onChange={(v) => updateContent((c) => ({ ...c, education: c.education.map((e) => (e.id === item.id ? { ...e, endDate: v } : e)) }))} />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-add mt-1"
            onClick={() => {
              const item: EducationItem = { id: crypto.randomUUID(), school: "", degree: "", field: "", startDate: "", endDate: "" };
              updateContent((c) => ({ ...c, education: [...c.education, item] }));
            }}
          >
            + Add school
          </button>
        </section>
      ) : null}

      {content.sectionVisibility.projects !== false ? (
        <section className="section-card">
          <h2 className="serif section-heading text-lg">Projects</h2>
          {(content.projects || []).map((item) => (
            <div key={item.id} className="card mb-3 p-4">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="Delete project"
                  onClick={() => updateContent((c) => ({ ...c, projects: c.projects.filter((p) => p.id !== item.id) }))}
                >
                  ×
                </button>
              </div>
              <Field label="Name" value={item.name} onChange={(v) => updateContent((c) => ({ ...c, projects: c.projects.map((p) => (p.id === item.id ? { ...p, name: v } : p)) }))} />
              <div className="mt-3">
                <Field label="URL" value={item.url} onChange={(v) => updateContent((c) => ({ ...c, projects: c.projects.map((p) => (p.id === item.id ? { ...p, url: v } : p)) }))} />
              </div>
              <div className="mt-3">
                <RichText
                  value={item.description}
                  onChange={(html) => updateContent((c) => ({ ...c, projects: c.projects.map((p) => (p.id === item.id ? { ...p, description: html } : p)) }))}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-add mt-1"
            onClick={() => {
              const item: ProjectItem = { id: crypto.randomUUID(), name: "", description: "", url: "" };
              updateContent((c) => ({ ...c, projects: [...(c.projects || []), item] }));
            }}
          >
            + Add project
          </button>
        </section>
      ) : null}

      {content.sectionVisibility.awards !== false ? (
        <section className="section-card">
          <h2 className="serif section-heading text-lg">Awards</h2>
          {(content.awards || []).map((item) => (
            <div key={item.id} className="card mb-3 p-4">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  className="btn-icon"
                  aria-label="Delete award"
                  onClick={() => updateContent((c) => ({ ...c, awards: c.awards.filter((a) => a.id !== item.id) }))}
                >
                  ×
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Title" value={item.title} onChange={(v) => updateContent((c) => ({ ...c, awards: c.awards.map((a) => (a.id === item.id ? { ...a, title: v } : a)) }))} />
              <Field label="Issuer" value={item.issuer} onChange={(v) => updateContent((c) => ({ ...c, awards: c.awards.map((a) => (a.id === item.id ? { ...a, issuer: v } : a)) }))} />
              <Field label="Date" value={item.date} onChange={(v) => updateContent((c) => ({ ...c, awards: c.awards.map((a) => (a.id === item.id ? { ...a, date: v } : a)) }))} />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-add mt-1"
            onClick={() => {
              const item: AwardItem = { id: crypto.randomUUID(), title: "", issuer: "", date: "" };
              updateContent((c) => ({ ...c, awards: [...(c.awards || []), item] }));
            }}
          >
            + Add award
          </button>
        </section>
      ) : null}

      {content.sectionVisibility.skills !== false ? (
        <section className="section-card">
          <h2 className="serif section-heading text-lg">Skills</h2>
          <form onSubmit={addSkill} className="flex gap-2">
            <input className="field" value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)} placeholder="Add a skill and press Enter" />
            <button className="btn btn-copper" type="submit">
              Add
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {content.skills.map((skill) => (
              <span key={skill} className="chip">
                {skill}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => updateContent((c) => ({ ...c, skills: c.skills.filter((s) => s !== skill) }))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
