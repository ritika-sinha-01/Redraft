import type { ResumeContent } from "../types/resume";
import { resumePlainText } from "../types/resume";
import { extractKeywords, keywordAnalysis } from "./intelligence";
import { improveResumeContent } from "./improveResume";

function strip(html: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function titleCase(word: string) {
  if (word !== word.toLowerCase()) return word;
  if (/^[a-z0-9.+#-]+$/i.test(word) && word.length <= 12) return word.toUpperCase() === word ? word : word;
  return word.replace(/^[a-z]/, (c) => c.toUpperCase());
}

export function tailorResumeToJob(
  content: ResumeContent,
  opts: { role?: string; company?: string; jobDescription?: string }
): ResumeContent {
  const next = improveResumeContent(content);
  const jd = (opts.jobDescription || "").trim();
  const role = (opts.role || "").trim();
  const company = (opts.company || "").trim();
  const target = [role, company].filter(Boolean).join(" at ");

  if (jd) {
    const analysis = keywordAnalysis(jd, next);
    const hay = resumePlainText(next).toLowerCase();
    const skillsLower = new Set(next.skills.map((s) => s.toLowerCase()));
    const surfaced = analysis.missing
      .filter((k) => hay.includes(k) && !skillsLower.has(k))
      .slice(0, 6)
      .map((k) => titleCase(k));
    if (surfaced.length) next.skills = [...next.skills, ...surfaced];

    const keywords = extractKeywords(jd).slice(0, 8);
    const existing = strip(next.summary);
    if (target && existing && !existing.toLowerCase().includes(target.toLowerCase())) {
      next.summary = `${existing} Targeting ${target}.`;
    } else if (!existing && target) {
      const skillBit = next.skills.slice(0, 4).join(", ");
      next.summary = `${next.personal.fullName.split(" ")[0] || "Candidate"} — ${role || "professional"}${
        company ? ` applying to ${company}` : ""
      }.${skillBit ? ` Strengths: ${skillBit}.` : ""}`;
    }
    if (keywords.length && next.experience[0] && strip(next.experience[0].description)) {
      const first = next.experience[0];
      const desc = strip(first.description);
      const mentioned = keywords.filter((k) => desc.toLowerCase().includes(k)).slice(0, 3);
      if (mentioned.length && !/aligned to /i.test(desc)) {
        first.description = `${first.description}<p>Aligned to ${mentioned.join(", ")} from the target role.</p>`;
      }
    }
  } else if (target) {
    const existing = strip(next.summary);
    if (existing && !existing.toLowerCase().includes(target.toLowerCase())) {
      next.summary = `${existing} Targeting ${target}.`;
    }
  }

  return next;
}
