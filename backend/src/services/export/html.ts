import type { DesignPreferences, LayoutPreferences, ResumeContent, SectionKey } from "../../types/resume";
import {
  DEFAULT_DESIGN,
  DEFAULT_LAYOUT,
  FONT_STACKS,
  sanitizeRichText,
} from "../../types/resume";

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function contactLine(c: ResumeContent): string {
  const p = c.personal;
  return [p.email, p.phone, p.location, p.linkedin, p.website, p.portfolioUrl]
    .filter(Boolean)
    .map(esc)
    .join("  ·  ");
}

function dateRange(start: string, end: string, current?: boolean): string {
  const right = current ? "Present" : end;
  if (!start && !right) return "";
  return esc([start, right].filter(Boolean).join(" – "));
}

function experienceHtml(c: ResumeContent): string {
  return c.experience
    .filter((e) => e.company || e.title || e.description)
    .map(
      (e) => `
      <div class="item">
        <div class="item-head">
          <div><span class="item-title">${esc(e.title)}</span>${e.company ? `<span class="item-org"> · ${esc(e.company)}</span>` : ""}</div>
          <div class="item-meta">${dateRange(e.startDate, e.endDate, e.current)}${e.location ? ` · ${esc(e.location)}` : ""}</div>
        </div>
        ${e.description ? `<div class="item-body">${sanitizeRichText(e.description)}</div>` : ""}
      </div>`
    )
    .join("");
}

function educationHtml(c: ResumeContent): string {
  return c.education
    .filter((e) => e.school || e.degree)
    .map(
      (e) => `
      <div class="item">
        <div class="item-head">
          <div><span class="item-title">${esc(e.degree)}${e.field ? ` in ${esc(e.field)}` : ""}</span>${e.school ? `<span class="item-org"> · ${esc(e.school)}</span>` : ""}</div>
          <div class="item-meta">${dateRange(e.startDate, e.endDate)}</div>
        </div>
      </div>`
    )
    .join("");
}

function projectsHtml(c: ResumeContent): string {
  return (c.projects || [])
    .filter((p) => p.name || p.description)
    .map(
      (p) => `
      <div class="item">
        <div class="item-head">
          <span class="item-title">${esc(p.name)}</span>
          ${p.url ? `<span class="item-meta">${esc(p.url)}</span>` : ""}
        </div>
        ${p.description ? `<div class="item-body">${sanitizeRichText(p.description)}</div>` : ""}
      </div>`
    )
    .join("");
}

function awardsHtml(c: ResumeContent): string {
  return (c.awards || [])
    .filter((a) => a.title)
    .map(
      (a) => `
      <div class="item">
        <div class="item-head">
          <span class="item-title">${esc(a.title)}</span>
          <span class="item-meta">${esc([a.issuer, a.date].filter(Boolean).join(" · "))}</span>
        </div>
      </div>`
    )
    .join("");
}

function skillsHtml(c: ResumeContent): string {
  if (!c.skills.length) return "";
  return `<div class="skills">${c.skills.map((s) => `<span class="skill">${esc(s)}</span>`).join("")}</div>`;
}

function section(title: string, inner: string): string {
  if (!inner.trim()) return "";
  return `<section><h2>${esc(title)}</h2>${inner}</section>`;
}

function sectionsHtml(c: ResumeContent): string {
  const vis = c.sectionVisibility;
  const builders: Record<SectionKey, () => string> = {
    summary: () => section("Summary", c.summary ? `<div class="item-body">${sanitizeRichText(c.summary)}</div>` : ""),
    experience: () => section("Experience", experienceHtml(c)),
    education: () => section("Education", educationHtml(c)),
    skills: () => section("Skills", skillsHtml(c)),
    projects: () => section("Projects", projectsHtml(c)),
    awards: () => section("Awards", awardsHtml(c)),
  };
  const order = c.sectionOrder?.length
    ? c.sectionOrder
    : (["summary", "experience", "education", "skills", "projects", "awards"] as SectionKey[]);
  return order
    .filter((key) => vis[key] !== false)
    .map((key) => builders[key]())
    .join("");
}

function templateCss(slug: string, design: DesignPreferences, layout: LayoutPreferences): string {
  const font = FONT_STACKS[design.fontFamily] || FONT_STACKS.georgia;
  const accent = design.accentColor || "#1f3a4c";
  const pad = layout.pagePadding || 52;
  const gap = layout.sectionGap || 18;
  const lh = layout.lineHeight || 1.45;
  const shared = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111; font-family: ${font}; }
    .page { width: 794px; min-height: 1123px; padding: ${pad}px; margin: 0 auto; --accent: ${accent}; }
    h1 { font-weight: 700; letter-spacing: -0.02em; font-size: 30px; }
    h2 { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; margin: ${gap}px 0 10px; padding-bottom: 4px; color: var(--accent); border-bottom: 2px solid var(--accent); }
    .contact { font-size: 12px; margin-top: 6px; color: #444; }
    .item { margin-bottom: 12px; }
    .item-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .item-title { font-weight: 600; font-size: 13.5px; }
    .item-org { font-size: 13px; }
    .item-meta { font-size: 11.5px; color: #555; white-space: nowrap; }
    .item-body { font-size: 12.5px; line-height: ${lh}; margin-top: 4px; color: #222; }
    .item-body ul, .item-body ol { padding-left: 18px; }
    .skills { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill { font-size: 12px; padding: 3px 8px; background: color-mix(in srgb, var(--accent) 12%, white); color: var(--accent); }
  `;
  const extras: Record<string, string> = {
    classic: `h1, .contact { text-align: center; } h2 { color: #222; border-bottom: 1px solid #222; } .skill { background: transparent; border: 1px solid #ccc; color: #222; }`,
    modern: `.page { border-left: 8px solid var(--accent); } .skill { border-radius: 999px; }`,
    minimal: `h1 { font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; font-size: 24px; } h2 { color: #666; border-bottom: 1px solid #e5e5e5; font-weight: 500; }`,
    professional: `.page { padding: 0; } .band { background: var(--accent); color: #fff; padding: 36px ${pad}px 28px; } .band h1, .band .contact { color: #fff; } .inner { padding: 28px ${pad}px ${pad}px; } .skill { background: var(--accent); color: #fff; }`,
    compact: `.page { padding: ${Math.max(28, pad - 16)}px; } h1 { font-size: 22px; } h2 { margin: 12px 0 6px; } .item { margin-bottom: 6px; }`,
    serif: `h1 { font-family: Garamond, Georgia, serif; font-size: 34px; font-weight: 500; }`,
    executive: `.page { padding: 0; } .band { background: #0b1c2c; color: #fff; padding: 40px ${pad}px 24px; border-bottom: 6px solid var(--accent); } .band h1, .band .contact { color: #fff; } .inner { padding: 24px ${pad}px ${pad}px; }`,
    sidebar: `.page { display: grid; grid-template-columns: 240px 1fr; padding: 0; min-height: 1123px; } .band { background: var(--accent); color: #fff; padding: 36px 22px; } .band h1 { font-size: 22px; color: #fff; } .band .contact { color: #fff; font-size: 11px; line-height: 1.6; } .inner { padding: 32px 28px; }`,
    midnight: `.page { background: #0e1116; color: #e8e6e1; } h1, .contact, .item-title, .item-body, .item-org { color: #e8e6e1; } .item-meta { color: #9aa3ad; } h2 { color: var(--accent); } .skill { background: #1c2430; }`,
    copper: `h1 { color: #9a3f18; } h2 { border-bottom-color: #c45c26; } .skill { background: #f4e1d4; color: #9a3f18; }`,
    editorial: `h1 { font-size: 40px; font-weight: 400; letter-spacing: -0.04em; } h2 { letter-spacing: 0.28em; border-bottom-width: 1px; }`,
    aurora: `.page { padding: 0; } .band { background: linear-gradient(120deg, var(--accent), #7c3aed 70%); color: #fff; padding: 40px ${pad}px 30px; } .band h1, .band .contact { color: #fff; } .inner { padding: 28px ${pad}px ${pad}px; }`,
  };
  return shared + (extras[slug] || extras.classic);
}

function usesBand(slug: string) {
  return ["professional", "executive", "sidebar", "aurora"].includes(slug);
}

export function renderResumeHtml(
  content: ResumeContent,
  slug: string,
  design: DesignPreferences = DEFAULT_DESIGN,
  layout: LayoutPreferences = DEFAULT_LAYOUT
): string {
  const p = content.personal;
  const inner = sectionsHtml(content);
  const header = `
    <h1>${esc(p.fullName || "Your Name")}</h1>
    <p class="contact">${contactLine(content) || "email · phone · location"}</p>`;
  const body = usesBand(slug)
    ? `<div class="band">${header}</div><div class="inner">${inner}</div>`
    : `<header>${header}</header>${inner}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${templateCss(slug, design, layout)}</style></head>
    <body><div class="page tpl-${esc(slug)}">${body}</div></body></html>`;
}
