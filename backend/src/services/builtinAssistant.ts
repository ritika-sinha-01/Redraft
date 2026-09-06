import type { ResumeContent } from "../types/resume";
import { analyzeResumeReport } from "./atsAnalyzer";
import { suggestImprovements, suggestSummary } from "./intelligence";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export function builtinChat(opts: { messages: ChatMessage[]; resume?: ResumeContent | null; system?: string }): string {
  const last = [...opts.messages].reverse().find((m) => m.role === "user")?.content?.trim() || "";
  const resume = opts.resume || null;
  const q = last.toLowerCase();

  if (!last) {
    return "Ask a question about your resume — for example: what should I change, rewrite my summary, or help me prep an interview.";
  }

  if (/^(ok|okay|thanks|thank you|hi|hello|hey|yes|no)\b/.test(q) && q.length < 24) {
    return resume
      ? `${nameOf(resume)}, I already have your resume. Ask “what should I change?” for a review, or paste one bullet and I will rewrite it.`
      : "Pick a resume on the left, then ask what to change.";
  }

  if (/(cover letter|covering letter)/.test(q)) return coverHelp(last, resume);
  if (/(interview|tell me about yourself|weakness|strength)/.test(q)) return interviewHelp(q, resume);
  if (/(summar|about me|profile headline)/.test(q)) return summaryHelp(resume);
  if (/(rewrite|tighten|bullet|wording|stronger)/.test(q) && !/(resume|cv|change|review|improve)/.test(q)) {
    return rewriteHelp(last, resume);
  }
  if (/(skill|keyword|ats|job description|jd\b|match)/.test(q) && last.length > 80) {
    return keywordHelp(last, resume);
  }

  return reviewHelp(resume, last);
}

function nameOf(resume: ResumeContent) {
  return resume.personal.fullName.split(" ")[0] || "You";
}

function titleOf(resume: ResumeContent) {
  return resume.experience.find((e) => e.title)?.title || "your current role";
}

function strip(html: string) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function reviewHelp(resume: ResumeContent | null, last: string): string {
  if (!resume) {
    return "Select a resume on the left, then ask again. I will score it and list the first changes to make.";
  }

  const report = analyzeResumeReport(resume);
  const summaries = suggestSummary(resume);
  const weakBullets = resume.experience
    .flatMap((e) =>
      strip(e.description)
        .split(/(?<=[.!?])\s+|•|-\s+/)
        .map((line) => ({ role: e.title || e.company, line: line.trim() }))
        .filter((x) => x.line.length > 20)
    )
    .filter((x) => /responsible for|helped|worked on|tasked with|assisted|participated/i.test(x.line) || !/\d/.test(x.line))
    .slice(0, 3);

  const findings = report.findings
    .filter((f) => f.severity === "high" || f.severity === "medium")
    .slice(0, 5);
  const lines = (report.lines || []).filter((l) => l.score < 70).slice(0, 3);

  const parts: string[] = [
    `${nameOf(resume)}, here is a review of the attached resume (${titleOf(resume)}). Overall score: ${report.score}/100.`,
  ];

  if (findings.length) {
    parts.push(
      "Fix these first:\n" +
        findings
          .map((f, i) => `${i + 1}. ${f.title}${f.location ? ` — ${f.location}` : ""}. ${f.fix || f.detail}`)
          .join("\n")
    );
  } else {
    parts.push(report.summary || "The basics are in place. The next gains come from sharper bullets and a tighter summary.");
  }

  if (lines.length) {
    parts.push(
      "Lines to rewrite:\n" +
        lines.map((l) => `• ${l.location}: ${l.tip}${l.fix ? ` Try: ${l.fix}` : ""}`).join("\n")
    );
  } else if (weakBullets.length) {
    parts.push(
      "These lines are thin — add a verb and a number:\n" +
        weakBullets
          .map((b) => {
            const next = suggestImprovements(b.line)[0];
            return `• ${b.role}: “${b.line}”\n  Try: ${next}`;
          })
          .join("\n")
    );
  }

  if (!resume.summary || strip(resume.summary).length < 40) {
    parts.push(`Add a short summary. Draft you can paste:\n“${summaries[0]}”`);
  } else if (summaries[0] && summaries[0] !== strip(resume.summary)) {
    parts.push(`Stronger summary option:\n“${summaries[0]}”`);
  }

  if (resume.skills.length < 6) {
    parts.push("Skills is thin. Add 8–12 tools you have actually used, each 1–3 words.");
  }

  parts.push("Want me to rewrite one section next? Say “rewrite my summary” or paste a single bullet.");
  if (last.length > 8 && !/change|review|improve|resume|cv/.test(last.toLowerCase())) {
    parts.push(`You also asked: “${last.slice(0, 140)}”. If that is a job posting, paste the full description and I will list missing keywords.`);
  }
  return parts.join("\n\n");
}

function rewriteHelp(last: string, resume: ResumeContent | null) {
  const looksLikeRequest = /^(tighten|rewrite|improve|help|can you|please|make|fix)\b/i.test(last.trim());
  const source = looksLikeRequest
    ? strip(resume?.experience[0]?.description || resume?.summary || "")
    : last.replace(/^.*?:/, "").trim();
  if (!source) {
    return "Paste the exact bullet you want rewritten, or attach a resume that already has experience lines.";
  }
  const drafts = suggestImprovements(source);
  return [
    "Paste one of these in place of the original line:",
    ...drafts.map((d, i) => `${i + 1}. ${d}`),
    "Keep the facts true. Swap in a real number if you have one (users, %, weeks, revenue).",
  ].join("\n\n");
}

function summaryHelp(resume: ResumeContent | null) {
  if (!resume) return "Select a resume on the left and ask again. I will draft a 2–3 sentence summary from your title and skills.";
  const drafts = suggestSummary(resume);
  return [
    `Summary options for ${nameOf(resume)} (${titleOf(resume)}):`,
    ...drafts.map((d, i) => `${i + 1}. ${d}`),
    "Keep it under four lines. Name the role you want next, not only the one you have now.",
  ].join("\n\n");
}

function coverHelp(last: string, resume: ResumeContent | null) {
  const company = last.match(/\bat\s+([A-Z][\w& ]{1,40})/)?.[1] || "";
  return [
    "Open Cover letters, paste the job description, pick this resume, and generate. No API key needed.",
    company
      ? `For ${company}: paragraph 1 = why them, paragraph 2 = one proof from ${resume ? titleOf(resume) : "your latest role"}, paragraph 3 = what you want to do next. Stay under 300 words.`
      : "Tell me the company and role if you want a draft in this chat.",
  ].join("\n\n");
}

function interviewHelp(q: string, resume: ResumeContent | null) {
  const role = resume ? titleOf(resume) : "this role";
  const proof = resume ? strip(resume.experience[0]?.description || "").slice(0, 180) : "";
  if (q.includes("weakness")) {
    return "Pick a real, coachable gap — not “I work too hard.” Name the old habit, the change you made, and one result. Example: “I used to wait too long to get feedback. I now share a draft at the midpoint, which cut rework.”";
  }
  if (q.includes("tell me about yourself")) {
    return [
      "Use 60 seconds: present, past, future.",
      `“I am a ${role}. Most recently ${proof || "I [one result]"}. I am looking at this role because [their problem].”`,
      "Do not invent metrics. Use only what is on the resume.",
    ].join("\n\n");
  }
  return `Prepare three stories for a ${role} interview: a win, a conflict, and a miss. Situation, action, number. Paste one story and I will tighten it.`;
}

function keywordHelp(last: string, resume: ResumeContent | null) {
  if (!resume) return "Select a resume, then paste the job description.";
  const report = analyzeResumeReport(resume, { jobDescription: last });
  const missing = report.keywords?.missing?.slice(0, 8) || [];
  const match = report.keywords?.matchPercent;
  if (!missing.length) {
    return `Keyword match looks solid${match != null ? ` (${match}%)` : ""}. Mirror the employer’s phrasing in Skills and one bullet — do not keyword-stuff.`;
  }
  return [
    match != null ? `About ${match}% of the posting’s keywords appear on your resume.` : "Here are words from the posting that are not on your resume yet.",
    `Consider adding only if they are true: ${missing.join(", ")}.`,
    "Put tools in Skills. Put outcomes in Experience.",
  ].join("\n\n");
}
