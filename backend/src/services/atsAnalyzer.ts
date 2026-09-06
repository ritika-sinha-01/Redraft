import type { ResumeContent } from "../types/resume";
import { resumePlainText } from "../types/resume";
import { extractKeywords } from "./intelligence";

const STRONG_VERBS =
  /\b(led|built|created|managed|designed|launched|improved|reduced|increased|delivered|owned|developed|implemented|spearheaded|optimized|shipped|scaled|negotiated|automated|migrated|architected|mentored)\b/i;
const WEAK_START =
  /^(responsible for|helped|worked on|tasked with|assisted with|participated in|involved in|duties included|was part of)/i;
const BUZZ =
  /\b(team player|go-getter|synergy|self-starter|hard worker|detail-oriented|passionate|dynamic|results-driven|think outside the box|leveraged|utilize|proactive)\b/i;
const PRONOUNS = /\b(i|me|my|we|our)\b/i;
const GRAPHIC_TEMPLATES = new Set(["midnight", "aurora"]);

export type Finding = {
  severity: "high" | "medium" | "low" | "good";
  category: "impact" | "brevity" | "style" | "ats";
  title: string;
  detail: string;
  location?: string;
  fix?: string;
  example?: string;
};

export type CategoryScore = {
  key: "impact" | "brevity" | "style" | "ats" | "match";
  label: string;
  score: number;
  note: string;
};

export type LineReview = {
  location: string;
  text: string;
  score: number;
  tip: string;
  fix?: string;
};

export type AnalyzerCheck = {
  id: string;
  label: string;
  passed: boolean;
  why: string;
};

export type AnalyzerReport = {
  score: number;
  atsFriendly: boolean;
  target: number;
  summary: string;
  verdict: "not-ready" | "needs-work" | "recruiter-ready" | "strong";
  confidence: "low" | "medium" | "high";
  confidenceNote: string;
  readyWhen: string[];
  checks: AnalyzerCheck[];
  categories: CategoryScore[];
  findings: Finding[];
  lines: LineReview[];
  keywords?: { present: string[]; missing: string[]; matchPercent: number };
  warnings: { code: string; message: string }[];
};

function strip(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function words(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

const FIXES: Record<string, { fix: string; example?: string }> = {
  "Location is missing": {
    fix: "Add your city or “Remote — India” in Contact.",
    example: "Bengaluru, India",
  },
  "Roles missing title or company": {
    fix: "Every Experience card needs a job title and a company name — even internships.",
  },
  "Email is missing": {
    fix: "Open Contact and type a real email (name@gmail.com). Save, then re-run the score.",
    example: "alex.rivera@email.com",
  },
  "Phone number is missing": {
    fix: "Add a 10-digit mobile number in Contact so ATS and recruiters can parse it.",
    example: "+91 98765 43210",
  },
  "No skills section": {
    fix: "Add 8–12 job-relevant skills (tools + methods), one chip each.",
    example: "TypeScript · React · SQL · REST APIs · Agile",
  },
  "Skills list is thin": {
    fix: "Add the missing tools from the job post if you have used them. Keep each skill to 1–3 words.",
  },
  "Missing role dates": {
    fix: "On every Experience card, fill Start (and End or mark Current). Use Month YYYY or YYYY.",
    example: "2022 — Present",
  },
  "Graphic-heavy template": {
    fix: "Switch the template dropdown to Classic, Modern, or Professional before you export a PDF for ATS portals.",
  },
  "Unusual font": {
    fix: "In Design tools, pick Georgia or Calibri, then export again.",
  },
  "No professional summary": {
    fix: "Use Help write summary, then keep 2–3 sentences: title, years, and one proof point.",
    example: "Product engineer with 6+ years shipping dashboards used by 12k monthly users.",
  },
  "Summary is long": {
    fix: "Cut the summary to under 60 words. Keep title, years, and one metric. Delete soft adjectives.",
  },
  "No experience bullets": {
    fix: "Under each role, add 3–5 bullets. Start with a verb, end with a number.",
    example: "Led a team of 4 to ship a dashboard used by 12k monthly users.",
  },
  "Weak bullet openers": {
    fix: "Rewrite the first words. Replace “responsible for / helped / worked on” with Led, Built, Delivered, Reduced.",
    example: "Before: Responsible for the dashboard. After: Delivered a dashboard used by 12k users.",
  },
  "Too few quantified results": {
    fix: "Add a %, count, time, or ₹ figure to at least half of your bullets.",
    example: "Reduced page load time by 35% after splitting the API bundle.",
  },
  "Few action verbs": {
    fix: "Start each bullet with Led, Built, Launched, Reduced, Automated, or Mentored — not “was” or “did”.",
  },
  "Resume is too short": {
    fix: "Add 2 more roles or 3 extra bullets with outcomes. Empty sections don’t count.",
  },
  "Resume may run long": {
    fix: "Delete early-career filler, cap each role at 5 bullets, and keep to one page if you have under 8 years.",
  },
  "Some bullets run on": {
    fix: "Split long lines. One idea per bullet, under ~25 words. Move extra context to the next line.",
  },
  "First-person pronouns": {
    fix: "Delete I, my, and we. “Led the launch” not “I led the launch.”",
  },
  "Buzzwords detected": {
    fix: "Remove “team player / passionate / synergy”. Replace with a concrete result.",
    example: "Instead of “passionate team player”, write “Mentored 3 juniors who each shipped a feature.”",
  },
  "Table-like spacing": {
    fix: "Avoid tab-separated columns. Keep a simple left-aligned list.",
  },
  "Low keyword match to the job": {
    fix: "Copy missing keywords that are true for you into Skills or a relevant bullet, then re-run with the same JD.",
  },
};

function rewriteBullet(text: string) {
  let next = text.replace(WEAK_START, "Delivered ").replace(/\b(I|we|my|our)\b/gi, "").replace(/\s+/g, " ").trim();
  if (!STRONG_VERBS.test(next)) next = `Delivered ${next.charAt(0).toLowerCase()}${next.slice(1)}`;
  if (!/\d/.test(next)) next = `${next.replace(/\.$/, "")}, improving results by 20%.`;
  if (words(next).length > 28) next = words(next).slice(0, 22).join(" ") + ".";
  return next;
}

function applyFixes(findings: Finding[], missingKeywords: string[] = []) {
  for (const f of findings) {
    const extra = FIXES[f.title];
    if (extra) {
      f.fix = extra.fix;
      f.example = extra.example;
    } else if (f.severity !== "good") {
      f.fix = "Open that section in the editor, apply the note above, save, and re-run the analyser.";
    }
    if (f.title === "Low keyword match to the job" && missingKeywords.length) {
      f.fix = `Add these terms where they are true: ${missingKeywords.slice(0, 8).join(", ")}. Then re-run the analyser.`;
    }
  }
  return findings;
}

function bulletsOf(content: ResumeContent) {
  const out: { location: string; text: string }[] = [];
  content.experience.forEach((role, i) => {
    const label = role.title || role.company || `Role ${i + 1}`;
    const parts = strip(role.description)
      .split(/(?<=[.!?])\s+|(?=\u2022)|; /)
      .map((p) => p.replace(/^[-•●]\s*/, "").trim())
      .filter((p) => p.length > 12);
    if (!parts.length && strip(role.description)) {
      out.push({ location: label, text: strip(role.description) });
    } else {
      parts.forEach((text) => out.push({ location: label, text }));
    }
  });
  return out;
}

export function analyzeResumeReport(
  content: ResumeContent,
  opts: { slug?: string; fontFamily?: string; jobDescription?: string } = {}
): AnalyzerReport {
  const findings: Finding[] = [];
  const p = content.personal;
  const bullets = bulletsOf(content);
  const body = resumePlainText(content);
  const wordCount = words(body).length;
  const summary = strip(content.summary);

  let impact = 64;
  let brevity = 70;
  let style = 68;
  let ats = 58;

  if (!p.email) {
    ats -= 12;
    findings.push({
      severity: "high",
      category: "ats",
      title: "Email is missing",
      detail: "ATS parsers look for a plain-text email in the header.",
      location: "Contact",
    });
  }
  if (!p.location) {
    ats -= 6;
    findings.push({
      severity: "medium",
      category: "ats",
      title: "Location is missing",
      detail: "ATS and recruiters filter by city or “Remote”. Add one in Contact.",
      location: "Contact",
    });
  }
  if (!p.phone) {
    ats -= 8;
    findings.push({
      severity: "medium",
      category: "ats",
      title: "Phone number is missing",
      detail: "Add a phone number so recruiters and parsers can reach you.",
      location: "Contact",
    });
  }
  if (!content.skills.length) {
    ats -= 14;
    findings.push({
      severity: "high",
      category: "ats",
      title: "No skills section",
      detail: "Most ATS engines score a dedicated skills list. Add 6–12 keywords from the job.",
      location: "Skills",
    });
  } else if (content.skills.length < 5) {
    ats -= 6;
    findings.push({
      severity: "medium",
      category: "ats",
      title: "Skills list is thin",
      detail: `Only ${content.skills.length} skills found. Aim for 8–12 relevant tools and methods.`,
      location: "Skills",
    });
  } else {
    findings.push({
      severity: "good",
      category: "ats",
      title: "Skills section is present",
      detail: `${content.skills.length} skills listed — good for keyword matching.`,
      location: "Skills",
    });
  }

  const datesMissing = content.experience.filter((e) => (e.company || e.title) && !e.startDate).length;
  if (datesMissing) {
    ats -= 8;
    findings.push({
      severity: "medium",
      category: "ats",
      title: "Missing role dates",
      detail: `${datesMissing} role(s) have no start date. ATS and recruiters both expect dates.`,
      location: "Experience",
    });
  }

  if (GRAPHIC_TEMPLATES.has(opts.slug || "")) {
    ats -= 10;
    findings.push({
      severity: "high",
      category: "ats",
      title: "Graphic-heavy template",
      detail: "Dark or decorative layouts can confuse some ATS engines. Prefer Classic, Modern, or Professional for applications.",
    });
  }
  if (opts.fontFamily === "courier" || opts.fontFamily === "trebuchet") {
    ats -= 5;
    findings.push({
      severity: "low",
      category: "ats",
      title: "Unusual font",
      detail: "Georgia, Calibri, or similar serif/sans pairs parse more reliably.",
    });
  }

  if (!summary) {
    impact -= 8;
    findings.push({
      severity: "medium",
      category: "impact",
      title: "No professional summary",
      detail: "A 2–3 sentence summary helps recruiters place you in five seconds.",
      location: "Summary",
    });
  } else if (words(summary).length > 90) {
    brevity -= 8;
    findings.push({
      severity: "medium",
      category: "brevity",
      title: "Summary is long",
      detail: "Keep the summary under ~60 words. Lead with title, years, and one proof point.",
      location: "Summary",
    });
  }

  if (!bullets.length) {
    impact -= 24;
    findings.push({
      severity: "high",
      category: "impact",
      title: "No experience bullets",
      detail: "Add 3–5 accomplishment bullets per role, each starting with a strong verb.",
      location: "Experience",
    });
  }

  const weak = bullets.filter((b) => WEAK_START.test(b.text));
  if (weak.length) {
    impact -= Math.min(20, weak.length * 6);
    findings.push({
      severity: "high",
      category: "impact",
      title: "Weak bullet openers",
      detail: `${weak.length} bullet(s) start with “responsible for / helped / worked on”. Swap in Led, Built, Delivered.`,
      location: weak[0].location,
    });
  }

  const withMetrics = bullets.filter((b) => /\d/.test(b.text));
  const metricRate = bullets.length ? withMetrics.length / bullets.length : 0;
  if (bullets.length && metricRate < 0.4) {
    impact -= 14;
    findings.push({
      severity: "high",
      category: "impact",
      title: "Too few quantified results",
      detail: `${withMetrics.length} of ${bullets.length} bullets include a number. Add %, time saved, users, or revenue.`,
      location: "Experience",
    });
  } else if (metricRate >= 0.6) {
    findings.push({
      severity: "good",
      category: "impact",
      title: "Strong quantification",
      detail: `${Math.round(metricRate * 100)}% of bullets include a metric.`,
      location: "Experience",
    });
  }

  const verbHits = bullets.filter((b) => STRONG_VERBS.test(b.text));
  if (bullets.length && verbHits.length / bullets.length < 0.5) {
    impact -= 10;
    findings.push({
      severity: "medium",
      category: "impact",
      title: "Few action verbs",
      detail: "Start more bullets with Led, Built, Launched, Reduced, or Optimized.",
      location: "Experience",
    });
  }

  if (wordCount < 180) {
    brevity -= 16;
    findings.push({
      severity: "high",
      category: "brevity",
      title: "Resume is too short",
      detail: `About ${wordCount} words. Most mid-level resumes land between 400 and 700 words.`,
    });
  } else if (wordCount > 900) {
    brevity -= 12;
    findings.push({
      severity: "medium",
      category: "brevity",
      title: "Resume may run long",
      detail: `About ${wordCount} words. Trim older roles and keep to one page if you have under 8 years.`,
    });
  } else {
    findings.push({
      severity: "good",
      category: "brevity",
      title: "Length is in range",
      detail: `About ${wordCount} words — scannable for a recruiter.`,
    });
  }

  const longBullets = bullets.filter((b) => words(b.text).length > 28);
  if (longBullets.length) {
    brevity -= Math.min(16, longBullets.length * 4);
    findings.push({
      severity: "medium",
      category: "brevity",
      title: "Some bullets run on",
      detail: `${longBullets.length} bullet(s) are over 28 words. Cut filler and keep one idea per line.`,
      location: longBullets[0].location,
    });
  }

  const pronounHits = bullets.filter((b) => PRONOUNS.test(b.text)).length + (PRONOUNS.test(summary) ? 1 : 0);
  if (pronounHits) {
    style -= 10;
    findings.push({
      severity: "medium",
      category: "style",
      title: "First-person pronouns",
      detail: "Drop I / my / we. Resumes read cleaner in implied first person.",
    });
  }

  const buzzHits = [summary, ...bullets.map((b) => b.text)].filter((t) => BUZZ.test(t));
  if (buzzHits.length) {
    style -= Math.min(14, buzzHits.length * 4);
    findings.push({
      severity: "medium",
      category: "style",
      title: "Buzzwords detected",
      detail: "Words like “team player”, “passionate”, or “synergy” don’t prove impact. Replace with a result.",
    });
  }

  if (/\t/.test(body)) {
    ats -= 8;
    style -= 4;
    findings.push({
      severity: "medium",
      category: "ats",
      title: "Table-like spacing",
      detail: "Tab characters can scramble in ATS. Use simple left-aligned text.",
    });
  }

  const incompleteRoles = content.experience.filter((e) => (e.title || e.company || strip(e.description)) && !(e.title && e.company)).length;
  if (incompleteRoles) {
    ats -= 8;
    findings.push({
      severity: "high",
      category: "ats",
      title: "Roles missing title or company",
      detail: `${incompleteRoles} role(s) are incomplete. ATS needs both a job title and an employer name.`,
      location: "Experience",
    });
  } else if (content.experience.some((e) => e.title && e.company && e.description)) {
    findings.push({
      severity: "good",
      category: "style",
      title: "Roles have title, company, and detail",
      detail: "That structure is what recruiters and parsers expect.",
    });
  }

  let keywords: AnalyzerReport["keywords"];
  if (opts.jobDescription?.trim()) {
    const keys = extractKeywords(opts.jobDescription);
    const hay = body.toLowerCase();
    const present = keys.filter((k) => hay.includes(k));
    const missing = keys.filter((k) => !hay.includes(k));
    const matchPercent = keys.length ? Math.round((present.length / keys.length) * 100) : 0;
    keywords = { present, missing, matchPercent };
    if (matchPercent < 45) {
      ats -= 12;
      findings.push({
        severity: "high",
        category: "ats",
        title: "Low keyword match to the job",
        detail: `${matchPercent}% of job keywords appear on the resume. Add missing terms where they are true.`,
      });
    } else if (matchPercent >= 70) {
      findings.push({
        severity: "good",
        category: "ats",
        title: "Strong job-keyword match",
        detail: `${matchPercent}% of the job’s frequent words appear on the resume.`,
      });
    }
  }

  impact = clamp(impact);
  brevity = clamp(brevity);
  style = clamp(style);
  ats = clamp(ats);
  const keywordScore = keywords ? clamp(keywords.matchPercent) : null;
  const hasJd = Boolean(opts.jobDescription?.trim());
  const score = hasJd
    ? clamp(impact * 0.22 + brevity * 0.12 + style * 0.12 + ats * 0.24 + (keywordScore || 0) * 0.3)
    : clamp(impact * 0.32 + brevity * 0.16 + style * 0.16 + ats * 0.36);

  const categories: CategoryScore[] = [
    {
      key: "impact",
      label: "Impact",
      score: impact,
      note: impact >= 80 ? "Bullets lead with results." : "Add stronger verbs and numbers.",
    },
    {
      key: "brevity",
      label: "Brevity",
      score: brevity,
      note: brevity >= 80 ? "Length is easy to scan." : "Tighten long lines and filler.",
    },
    {
      key: "style",
      label: "Style",
      score: style,
      note: style >= 80 ? "Voice is resume-ready." : "Cut pronouns and clichés.",
    },
    {
      key: "ats",
      label: "ATS parse",
      score: ats,
      note: ats >= 80 ? "Parsers should read this cleanly." : "Fix contact, skills, dates, and layout.",
    },
    ...(keywordScore != null
      ? [
          {
            key: "match" as const,
            label: "Job match",
            score: keywordScore,
            note: keywordScore >= 70 ? "This resume uses the posting’s language." : "Paste missing keywords that are true for you.",
          },
        ]
      : []),
  ];

  const lines: LineReview[] = bullets.slice(0, 12).map((b) => {
    let lineScore = 70;
    let tip = "Solid line — keep the structure.";
    if (WEAK_START.test(b.text)) {
      lineScore -= 18;
      tip = "Rewrite the opener with a strong verb (Led, Built, Delivered).";
    }
    if (!/\d/.test(b.text)) {
      lineScore -= 12;
      tip = "Add a metric: %, users, time, or revenue.";
    } else lineScore += 8;
    if (!STRONG_VERBS.test(b.text)) {
      lineScore -= 8;
      if (tip.startsWith("Solid")) tip = "Start with an action verb.";
    }
    if (words(b.text).length > 28) {
      lineScore -= 10;
      tip = "Shorten to one idea, under ~25 words.";
    }
    const needsFix = lineScore < 80;
    return {
      location: b.location,
      text: b.text,
      score: clamp(lineScore),
      tip,
      fix: needsFix ? rewriteBullet(b.text) : undefined,
    };
  });

  applyFixes(findings, keywords?.missing || []);

  const highCount = findings.filter((f) => f.severity === "high").length;
  const checks: AnalyzerCheck[] = [
    { id: "email", label: "Plain-text email", passed: Boolean(p.email), why: "ATS contact parsers require an email." },
    { id: "phone", label: "Phone number", passed: Boolean(p.phone), why: "Recruiters and many ATS fields expect a phone." },
    { id: "location", label: "City or Remote", passed: Boolean(p.location), why: "Location is a common ATS filter." },
    { id: "skills", label: "8+ skills", passed: content.skills.length >= 8, why: `${content.skills.length} listed. Keyword screens look here first.` },
    { id: "dates", label: "Every role has dates", passed: datesMissing === 0, why: "Missing dates often drop a role from the parsed timeline." },
    { id: "titles", label: "Title + company on every role", passed: incompleteRoles === 0, why: "Parsers map jobs as title @ company." },
    { id: "metrics", label: "Half of bullets have a number", passed: metricRate >= 0.5, why: `${withMetrics.length}/${bullets.length || 0} bullets quantified.` },
    { id: "verbs", label: "Strong action verbs", passed: bullets.length > 0 && verbHits.length / bullets.length >= 0.5, why: "Weak openers get skipped by both ATS and humans." },
    { id: "layout", label: "ATS-safe layout", passed: !GRAPHIC_TEMPLATES.has(opts.slug || "") && !/\t/.test(body), why: "Columns, dark themes, and tabs often scramble in Workday/Taleo." },
    { id: "keywords", label: "Job-keyword match 70%+", passed: hasJd && (keywordScore || 0) >= 70, why: hasJd ? `${keywordScore}% of the posting’s terms appear.` : "Paste a job description — this is the real ATS gate." },
  ];
  const passedChecks = checks.filter((c) => c.passed).length;
  const hardFails = checks.filter((c) => !c.passed && ["email", "titles", "layout"].includes(c.id)).length;

  let verdict: AnalyzerReport["verdict"] = "not-ready";
  if (score >= 82 && highCount === 0 && (!hasJd || (keywordScore || 0) >= 70) && hardFails === 0) verdict = "strong";
  else if (score >= 75 && highCount === 0 && (!hasJd || (keywordScore || 0) >= 55)) verdict = "recruiter-ready";
  else if (score >= 55) verdict = "needs-work";

  const confidence: AnalyzerReport["confidence"] = hasJd ? ((keywordScore || 0) >= 55 ? "high" : "medium") : "low";
  const confidenceNote = hasJd
    ? "This score includes a real keyword screen against the job you pasted — the closest check to how ATS ranks you for that posting."
    : "This is a quality and parse score only. ATS ranking is job-specific. Paste a job description and re-run to know if this resume would pass that posting.";

  const readyWhen = [
    "Email, phone, and city/remote are filled",
    "Every job has title, company, and dates",
    "At least half of bullets include a number",
    "Skills lists 8–12 real tools from the job",
    "Keyword match is 70%+ against the posting you want",
    "No high-severity issues remain",
  ];

  const summaryLine =
    verdict === "strong"
      ? `Strong on the checks that matter (${passedChecks}/${checks.length} passed). Recruiter- and ATS-ready for this posting.`
      : verdict === "recruiter-ready"
        ? `In range (${passedChecks}/${checks.length} checks passed). Fix remaining notes before you apply.`
        : highCount
          ? `${highCount} high-priority issue${highCount > 1 ? "s" : ""} — the score is not reliable until those are fixed.`
          : "Not ready yet. Use the checklist below; a high number without a job description is not a real ATS pass.";

  return {
    score,
    atsFriendly: verdict === "strong" || verdict === "recruiter-ready",
    target: 75,
    summary: summaryLine,
    verdict,
    confidence,
    confidenceNote,
    readyWhen,
    checks,
    categories,
    findings: findings.sort((a, b) => rank(a.severity) - rank(b.severity)),
    lines,
    keywords,
    warnings: findings
      .filter((f) => f.severity !== "good")
      .map((f) => ({ code: f.category, message: f.title + " — " + f.detail })),
  };
}

function rank(severity: Finding["severity"]) {
  return { high: 0, medium: 1, low: 2, good: 3 }[severity];
}
