import { Document, Packer, Paragraph, TextRun } from "docx";
import type { ResumeContent } from "../types/resume";
import { resumePlainText } from "../types/resume";
import { llmChat, type LlmProvider } from "./llm";

export interface CoverLetterContent {
  greeting: string;
  paragraphs: string[];
  signoff: string;
  senderName: string;
}

export interface CoverLetterDesign {
  layout: "classic" | "modern" | "compact";
  fontFamily: "georgia" | "garamond" | "segoe";
  accentColor: string;
  align: "left" | "center";
  spacing: "comfortable" | "tight";
}

export const DEFAULT_COVER_CONTENT: CoverLetterContent = {
  greeting: "Dear Hiring Manager,",
  paragraphs: [""],
  signoff: "Sincerely,",
  senderName: "",
};

export const DEFAULT_COVER_DESIGN: CoverLetterDesign = {
  layout: "classic",
  fontFamily: "georgia",
  accentColor: "#c45c26",
  align: "left",
  spacing: "comfortable",
};

export function parseCoverContent(raw: string): CoverLetterContent {
  try {
    const parsed = JSON.parse(raw) as Partial<CoverLetterContent>;
    return {
      ...DEFAULT_COVER_CONTENT,
      ...parsed,
      paragraphs: parsed.paragraphs?.length ? parsed.paragraphs : [""],
    };
  } catch {
    return { ...DEFAULT_COVER_CONTENT };
  }
}

function extractJson(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
  try {
    return JSON.parse(cleaned) as CoverLetterContent;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return JSON");
    return JSON.parse(match[0]) as CoverLetterContent;
  }
}

export function parseCoverDesign(raw: string): CoverLetterDesign {
  try {
    return { ...DEFAULT_COVER_DESIGN, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COVER_DESIGN };
  }
}

export async function generateCoverLetter(opts: {
  provider: LlmProvider;
  apiKey: string;
  resume: ResumeContent;
  company: string;
  role: string;
  jobDescription: string;
}): Promise<CoverLetterContent> {
  const name = opts.resume.personal.fullName || "Applicant";
  const brief = resumePlainText(opts.resume).slice(0, 3500);
  const system =
    "You write concise, specific cover letters. Return ONLY valid JSON with keys greeting, paragraphs (array of 3 short paragraphs), signoff, senderName. No markdown.";
  const prompt = `Write a cover letter for ${name} applying to ${opts.role || "the role"} at ${opts.company || "the company"}.
Job description:
${opts.jobDescription || "(none provided — write a strong general letter)"}

Resume:
${brief}`;

  if (!opts.apiKey) {
    return heuristicLetter(opts.resume, opts.company, opts.role, opts.jobDescription);
  }

  try {
    const raw = await llmChat({
      provider: opts.provider,
      apiKey: opts.apiKey,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const parsed = extractJson(raw);
    const paragraphs = (parsed.paragraphs || []).filter(Boolean).slice(0, 5);
    return {
      greeting: parsed.greeting || "Dear Hiring Manager,",
      paragraphs: paragraphs.length ? paragraphs : ["I would welcome the chance to discuss this role."],
      signoff: parsed.signoff || "Sincerely,",
      senderName: parsed.senderName || name,
    };
  } catch {
    return heuristicLetter(opts.resume, opts.company, opts.role, opts.jobDescription);
  }
}

function heuristicLetter(resume: ResumeContent, company: string, role: string, jd: string): CoverLetterContent {
  const name = resume.personal.fullName || "Applicant";
  const title = resume.experience[0]?.title || "professional";
  const skills = resume.skills.slice(0, 5).join(", ") || "the skills listed on my resume";
  const jdHint = jd ? `I was drawn to this opening because it emphasizes ${jd.split(/\s+/).slice(0, 12).join(" ")}…` : `I am excited by the work ${company || "your team"} is doing.`;
  return {
    greeting: company ? `Dear ${company} Hiring Team,` : "Dear Hiring Manager,",
    paragraphs: [
      `I am writing to apply for the ${role || "open"} role${company ? ` at ${company}` : ""}. I am a ${title} and would bring the same care I have shown in previous roles.`,
      `${jdHint} My background includes ${skills}.`,
      `I would welcome the chance to discuss how I can contribute. Thank you for your time and consideration.`,
    ],
    signoff: "Sincerely,",
    senderName: name,
  };
}

const FONTS: Record<CoverLetterDesign["fontFamily"], string> = {
  georgia: 'Georgia, "Times New Roman", serif',
  garamond: "Garamond, Georgia, serif",
  segoe: '"Segoe UI", Arial, sans-serif',
};

export function renderCoverHtml(
  content: CoverLetterContent,
  design: CoverLetterDesign,
  meta: { company?: string; role?: string; email?: string; phone?: string; location?: string }
) {
  const font = FONTS[design.fontFamily] || FONTS.georgia;
  const pad = design.spacing === "tight" ? "36px 48px" : "56px 64px";
  const align = design.align;
  const contact = [meta.email, meta.phone, meta.location].filter(Boolean).join(" · ");
  const modern = design.layout === "modern";
  const compact = design.layout === "compact";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin:0; background:#fff; color:#12151c; font-family:${font}; }
    .page { width:794px; min-height:1123px; box-sizing:border-box; padding:${compact ? "32px 40px" : pad};
      ${modern ? `border-left:8px solid ${design.accentColor};` : ""} }
    .head { text-align:${align}; margin-bottom:28px; }
    h1 { margin:0; font-size:${compact ? "22px" : "28px"}; font-weight:600; }
    .meta { color:#555; font-size:12px; margin-top:6px; }
    .rule { height:2px; background:${design.accentColor}; margin:16px 0 24px; border:0; }
    p { font-size:${compact ? "13px" : "14.5px"}; line-height:${design.spacing === "tight" ? "1.4" : "1.6"}; margin:0 0 14px; }
    .sign { margin-top:28px; }
  </style></head><body><div class="page">
    <header class="head">
      <h1>${esc(content.senderName || "Your Name")}</h1>
      ${contact ? `<div class="meta">${esc(contact)}</div>` : ""}
      ${meta.role || meta.company ? `<div class="meta">${esc([meta.role, meta.company].filter(Boolean).join(" · "))}</div>` : ""}
    </header>
    <hr class="rule"/>
    <p>${esc(content.greeting)}</p>
    ${(content.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join("")}
    <div class="sign"><p>${esc(content.signoff)}</p><p>${esc(content.senderName)}</p></div>
  </div></body></html>`;
}

function esc(value: string) {
  return (value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderCoverDocx(content: CoverLetterContent, meta: { role?: string; company?: string }) {
  const children = [
    new Paragraph({ children: [new TextRun({ text: content.senderName || "Your Name", bold: true, size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: [meta.role, meta.company].filter(Boolean).join(" · "), size: 20 })] }),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: content.greeting, size: 24 })] }),
    new Paragraph({ text: "" }),
    ...(content.paragraphs || []).flatMap((p) => [new Paragraph({ children: [new TextRun({ text: p, size: 24 })] }), new Paragraph({ text: "" })]),
    new Paragraph({ children: [new TextRun({ text: content.signoff, size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: content.senderName, size: 24 })] }),
  ];
  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
