import type { ResumeContent } from "../types/resume";
import { resumePlainText } from "../types/resume";

const ACTION_VERBS = /\b(led|built|created|managed|designed|launched|improved|reduced|increased|delivered|owned|developed|implemented|spearheaded|optimized)\b/i;

export function analyzeAts(content: ResumeContent, slug: string, fontFamily: string) {
  const warnings: { code: string; message: string }[] = [];
  const p = content.personal;
  if (!p.email) warnings.push({ code: "contact", message: "Email is missing — ATS parsers expect a plain-text email." });
  if (!p.phone) warnings.push({ code: "contact", message: "Phone number is missing." });
  if (!content.skills.length) warnings.push({ code: "skills", message: "No skills listed. ATS systems often scan a dedicated skills section." });
  const datesMissing = content.experience.some((e) => (e.company || e.title) && !e.startDate);
  if (datesMissing) warnings.push({ code: "dates", message: "Some roles are missing start dates." });
  if (["midnight", "aurora"].includes(slug)) {
    warnings.push({ code: "graphics", message: "This template uses heavy graphics or dark backgrounds. Some ATS engines skip styled PDFs." });
  }
  if (fontFamily === "courier" || fontFamily === "trebuchet") {
    warnings.push({ code: "font", message: "Unusual font detected. Stick to Georgia, Calibri, or similar for ATS-friendly PDFs." });
  }
  const text = resumePlainText(content);
  if (text.length < 250) warnings.push({ code: "length", message: "Resume text is very short. Add more detail in experience and summary." });
  const hasVerbs = ACTION_VERBS.test(text);
  if (!hasVerbs) warnings.push({ code: "verbs", message: "Few action verbs found. Start bullets with Led, Built, Delivered, etc." });
  if (/\t/.test(text)) warnings.push({ code: "tables", message: "Tab characters found. Avoid table-based layouts." });
  return {
    atsFriendly: warnings.filter((w) => w.code !== "contact" && w.code !== "length").length === 0,
    score: Math.max(40, 100 - warnings.length * 10),
    warnings,
  };
}

const STOP = new Set(
  "the a an and or to of in for with on at from by as is are was were be been being this that these those your you we our their they it its will can may should".split(" ")
);

export function extractKeywords(jobDescription: string): string[] {
  const counts = new Map<string, number>();
  jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([w]) => w);
}

export function keywordAnalysis(jobDescription: string, content: ResumeContent) {
  const keywords = extractKeywords(jobDescription);
  const hay = resumePlainText(content).toLowerCase();
  const present = keywords.filter((k) => hay.includes(k));
  const missing = keywords.filter((k) => !hay.includes(k));
  return {
    keywords,
    present,
    missing,
    matchPercent: keywords.length ? Math.round((present.length / keywords.length) * 100) : 0,
    suggestions: missing.slice(0, 8).map((k) => `Consider adding “${k}” in skills or a relevant experience bullet.`),
  };
}

const WEAK: [RegExp, string][] = [
  [/responsible for /gi, "Owned "],
  [/helped /gi, "Supported "],
  [/worked on /gi, "Delivered "],
  [/tasked with /gi, "Led "],
];

export function suggestSummary(content: ResumeContent): string[] {
  const name = content.personal.fullName || "This candidate";
  const roles = content.experience.map((e) => e.title).filter(Boolean);
  const companies = content.experience.map((e) => e.company).filter(Boolean);
  const skills = content.skills.slice(0, 6);
  const existing = content.summary.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const role = roles[0] || "professional";
  const companyBit = companies[0] ? ` at ${companies[0]}` : "";
  const skillBit = skills.length ? ` Skilled in ${skills.slice(0, 4).join(", ")}.` : "";
  const years = inferYears(content);

  const drafts = [
    existing
      ? rewriteSummary(existing)
      : `${name.split(" ")[0]} is a ${role}${companyBit} with ${years}. ${skillBit} Known for shipping clear work and communicating results.`.replace(/\s+/g, " ").trim(),
    `${role}${companyBit}. ${years.charAt(0).toUpperCase()}${years.slice(1)} building products and collaborating across teams.${skillBit} Looking to bring the same pace to a new role.`,
    `Results-minded ${role} who leads with outcomes, not tasks.${skillBit} Recent work includes ${roles.slice(0, 2).join(" and ") || "cross-functional delivery"}.`,
  ];
  return Array.from(new Set(drafts.map((d) => d.replace(/\s+/g, " ").trim()))).slice(0, 3);
}

function inferYears(content: ResumeContent) {
  const years = content.experience
    .map((e) => parseInt(e.startDate.replace(/\D/g, "").slice(-4), 10))
    .filter((n) => n > 1980 && n < 2100);
  if (!years.length) return "hands-on experience";
  const span = new Date().getFullYear() - Math.min(...years);
  if (span < 2) return "early-career experience";
  return `${Math.min(span, 20)}+ years of experience`;
}

function rewriteSummary(plain: string) {
  let stronger = plain;
  for (const [re, sub] of WEAK) stronger = stronger.replace(re, sub);
  if (stronger.length > 360) stronger = stronger.slice(0, 350).replace(/\s+\S*$/, "") + ".";
  if (!ACTION_VERBS.test(stronger)) {
    stronger = stronger.replace(/^[A-Za-z]+/, (w) => w);
  }
  return stronger;
}

export function suggestImprovements(text: string): string[] {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) {
    return [
      "Delivered X that improved Y by Z%.",
      "Led a cross-functional team to launch a product used by N users.",
      "Designed and shipped a feature that reduced cycle time by N%.",
    ];
  }
  let stronger = plain;
  for (const [re, sub] of WEAK) stronger = stronger.replace(re, sub);
  if (!ACTION_VERBS.test(stronger)) stronger = `Delivered ${stronger.charAt(0).toLowerCase()}${stronger.slice(1)}`;
  const metric = /\d/.test(stronger) ? stronger : `${stronger.replace(/\.$/, "")}, improving results by 20%.`;
  const team = stronger.includes("team") ? stronger : `Led a team to ${stronger.charAt(0).toLowerCase()}${stronger.slice(1)}`;
  const concise = stronger.length > 180 ? stronger.slice(0, 170).replace(/\s+\S*$/, "") + "." : stronger;
  return Array.from(new Set([metric, team, concise])).slice(0, 3);
}

export function scoreResume(content: ResumeContent) {
  const checks = [
    Boolean(content.personal.fullName),
    Boolean(content.personal.email),
    Boolean(content.personal.phone),
    Boolean(content.personal.location),
    Boolean(content.summary && content.summary.length > 40),
    content.experience.some((e) => e.title && e.company && e.description),
    content.education.some((e) => e.school && e.degree),
    content.skills.length >= 4,
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const bullets = content.experience.filter((e) => /<li>|^[-•]/m.test(e.description)).length;
  const avgLen =
    content.experience.reduce((s, e) => s + e.description.replace(/<[^>]+>/g, "").length, 0) /
    Math.max(1, content.experience.length);
  let readability: "Excellent" | "Good" | "Needs Improvement" = "Good";
  let note = "Sentences are a reasonable length for a resume.";
  if (avgLen > 420) {
    readability = "Needs Improvement";
    note = "Several bullets are long. Break them into shorter, scannable lines.";
  } else if (bullets > 0 && avgLen < 280) {
    readability = "Excellent";
    note = "Bullets are concise and easy to scan.";
  } else if (!content.summary) {
    readability = "Needs Improvement";
    note = "Add a short summary so recruiters can place you in 5 seconds.";
  }
  return { completeness, readability, note };
}
