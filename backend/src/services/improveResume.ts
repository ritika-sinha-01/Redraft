import type { ResumeContent } from "../types/resume";
import { suggestImprovements, suggestSummary } from "./intelligence";

export function wantsResumeBuild(text: string) {
  const q = text.toLowerCase();
  return /(pdf|\bdownload\b|\bexport\b|send (me )?(a |my )?(resume|cv|pdf)|make (me )?(a |my )?(resume|cv)|create (me )?(a |my )?(resume|cv)|build (me )?(a |my )?(resume|cv)|write (me )?(a |my )?(resume|cv)|polish (my )?(resume|cv))/.test(
    q
  );
}

export function improveResumeContent(content: ResumeContent): ResumeContent {
  const next: ResumeContent = {
    ...content,
    personal: { ...content.personal },
    experience: content.experience.map((e) => ({ ...e })),
    education: content.education.map((e) => ({ ...e })),
    skills: [...content.skills],
    projects: content.projects.map((e) => ({ ...e })),
    awards: content.awards.map((e) => ({ ...e })),
    customSections: content.customSections.map((e) => ({ ...e })),
    sectionOrder: [...content.sectionOrder],
    sectionVisibility: { ...content.sectionVisibility },
  };

  const drafts = suggestSummary(next);
  const summaryPlain = strip(next.summary);
  if (!summaryPlain || summaryPlain.length < 50) {
    next.summary = drafts[0] || next.summary;
  }

  next.experience = next.experience.map((role) => {
    const plain = strip(role.description);
    if (!plain) return role;
    const lines = plain
      .split(/\n|•|(?:^|\s)-\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 8);
    if (!lines.length) {
      const stronger = suggestImprovements(plain)[0];
      return { ...role, description: stronger ? `<ul><li>${esc(stronger)}</li></ul>` : role.description };
    }
    const bullets = lines.slice(0, 6).map((line) => {
      const weak = /responsible for|helped|worked on|tasked with|assisted|participated/i.test(line) || !/\d/.test(line);
      return weak ? suggestImprovements(line)[0] || line : line;
    });
    return { ...role, description: `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` };
  });

  next.sectionVisibility = {
    ...next.sectionVisibility,
    summary: true,
    experience: next.experience.some((e) => e.title || e.company || strip(e.description)),
    education: next.education.some((e) => e.school || e.degree),
    skills: next.skills.length > 0,
    projects: next.projects.some((p) => p.name),
    awards: next.awards.some((a) => a.title),
  };

  return next;
}

function strip(html: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
