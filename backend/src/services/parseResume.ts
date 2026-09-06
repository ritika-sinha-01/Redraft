import { randomUUID } from "crypto";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { createDefaultContent, type ResumeContent } from "../types/resume";

const SECTION_RE =
  /^(summary|professional summary|profile|objective|about|experience|work experience|professional experience|employment|education|academic|skills|technical skills|core skills|competencies|projects|selected projects|awards|honors|achievements|certifications)\s*:?\s*$/i;

function id() {
  return randomUUID();
}

function clean(line: string) {
  return line.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function extractPlainText(input: {
  filename?: string;
  mimeType?: string;
  base64?: string;
  text?: string;
}): Promise<string> {
  if (input.text?.trim()) return input.text.replace(/\r\n/g, "\n");
  if (!input.base64) throw Object.assign(new Error("Upload a PDF, Word, or text file."), { status: 400 });

  const buffer = Buffer.from(input.base64, "base64");
  if (buffer.length > 6 * 1024 * 1024) {
    throw Object.assign(new Error("File is too large. Use a file under 6 MB."), { status: 400 });
  }

  const name = (input.filename || "").toLowerCase();
  const mime = (input.mimeType || "").toLowerCase();
  const isPdf = mime.includes("pdf") || name.endsWith(".pdf") || buffer.subarray(0, 5).toString() === "%PDF-";
  const isDocx = mime.includes("officedocument.wordprocessingml") || name.endsWith(".docx");
  const isOldDoc = name.endsWith(".doc") && !name.endsWith(".docx");
  const isText = mime.includes("text") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf");

  if (isOldDoc) {
    throw Object.assign(new Error("Old .doc files are not supported. Save as .docx, PDF, or paste the text."), { status: 400 });
  }
  if (isPdf) {
    const text = await extractPdfText(buffer);
    if (!text.trim()) {
      throw Object.assign(new Error("This PDF looks scanned or empty. Paste the resume text, or export it as Word / .txt."), { status: 400 });
    }
    return text;
  }
  if (isDocx) {
    try {
      const parsed = await mammoth.extractRawText({ buffer });
      const text = (parsed.value || "").replace(/\r\n/g, "\n");
      if (!text.trim()) {
        throw Object.assign(new Error("Could not read text from that Word file. Paste the resume instead."), { status: 400 });
      }
      return text;
    } catch (err) {
      if (err && typeof err === "object" && "status" in err) throw err;
      throw Object.assign(new Error("Could not open that Word file. Use .docx or paste the text."), { status: 400 });
    }
  }
  if (isText) {
    return buffer.toString("utf8").replace(/\r\n/g, "\n");
  }
  throw Object.assign(new Error("Use a PDF, Word (.docx), or .txt file."), { status: 400 });
}

async function extractPdfText(buffer: Buffer) {
  try {
    const parsed = await pdfParse(buffer);
    const text = (parsed.text || "").replace(/\r\n/g, "\n").trim();
    if (text.length > 40) return text;
  } catch {
    // fall through to a simple stream extract
  }
  return extractPdfStrings(buffer);
}

function extractPdfStrings(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const chunks: string[] = [];
  const tj = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  const tj2 = /\[((?:[^\]]|\\])*)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = tj.exec(raw))) chunks.push(decodePdfString(match[1]));
  while ((match = tj2.exec(raw))) {
    const inner = match[1].match(/\(((?:\\.|[^\\)])*)\)/g) || [];
    chunks.push(inner.map((s) => decodePdfString(s.slice(1, -1))).join(""));
  }
  return chunks.join("\n").replace(/\r\n/g, "\n");
}

function decodePdfString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function splitSections(text: string): Record<string, string> {
  const lines = text.split("\n").map(clean);
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";

  for (const line of lines) {
    if (!line) {
      sections[current] = sections[current] || [];
      sections[current].push("");
      continue;
    }
    const match = line.match(SECTION_RE);
    if (match) {
      current = normalizeSection(match[1]);
      sections[current] = sections[current] || [];
      continue;
    }
    sections[current] = sections[current] || [];
    sections[current].push(line);
  }

  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join("\n").trim()]));
}

function normalizeSection(label: string) {
  const key = label.toLowerCase();
  if (/summary|profile|objective|about/.test(key)) return "summary";
  if (/experience|employment/.test(key)) return "experience";
  if (/education|academic/.test(key)) return "education";
  if (/skill|competenc/.test(key)) return "skills";
  if (/project/.test(key)) return "projects";
  if (/award|honor|achievement|certif/.test(key)) return "awards";
  return key;
}

function parseContact(header: string, rest: string) {
  const hay = `${header}\n${rest}`;
  const email = hay.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = hay.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || "";
  const linkedin = hay.match(/linkedin\.com\/in\/[A-Za-z0-9_-]+/i)?.[0] || "";
  const website =
    hay.match(/https?:\/\/(?!linkedin\.com)[^\s)]+/i)?.[0] ||
    hay.match(/\b(?:www\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)?.[0] ||
    "";
  const location =
    header
      .split("\n")
      .map(clean)
      .find((line) => /,\s*[A-Z]{2}\b/.test(line) || /\b(India|USA|UK|Canada|Remote)\b/i.test(line)) || "";

  const nameLine =
    header
      .split("\n")
      .map(clean)
      .find((line) => {
        if (!line || (email && line.includes(email)) || (phone && line.includes(phone.replace(/\s/g, "")))) return false;
        if (/@|linkedin|http|www\./i.test(line)) return false;
        const words = line.split(" ").filter(Boolean);
        return words.length >= 2 && words.length <= 5 && line.length < 48;
      }) || "";

  return {
    fullName: nameLine,
    email,
    phone,
    location,
    linkedin,
    website,
    portfolioUrl: "",
  };
}

function parseDates(line: string) {
  const match = line.match(
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|\d{1,2}\/\d{4})\s*[-–—to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|\d{1,2}\/\d{4}|present|current)/i
  );
  if (!match) return { startDate: "", endDate: "", current: false, rest: line };
  return {
    startDate: match[1],
    endDate: /present|current/i.test(match[2]) ? "" : match[2],
    current: /present|current/i.test(match[2]),
    rest: line.replace(match[0], "").replace(/[|•·]+$/g, "").trim(),
  };
}

function chunkBlocks(section: string) {
  return section
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function bulletsFrom(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-•●▪◦*]\s*/, "").trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return `<ul>${lines.map((l) => `<li>${escapeText(l)}</li>`).join("")}</ul>`;
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseExperience(section: string) {
  const blocks = chunkBlocks(section);
  const items = blocks.map((block) => {
    const lines = block.split("\n").map(clean).filter(Boolean);
    const first = lines[0] || "";
    const second = lines[1] || "";
    const dated = parseDates(first);
    const dated2 = parseDates(second);
    const titleCompany = (dated.rest || first)
      .split(/\s*[|·•]\s*|\s+[-–—]\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    const title = titleCompany[0] || "";
    const company = titleCompany[1] || "";
    const descLines = lines.slice(titleCompany[1] || dated2.rest ? 2 : 1);
    return {
      id: id(),
      title,
      company: company === title ? "" : company,
      location: "",
      startDate: dated.startDate || dated2.startDate,
      endDate: dated.endDate || dated2.endDate,
      current: dated.current || dated2.current,
      description: bulletsFrom(descLines.join("\n")),
    };
  });
  return items.filter((e) => e.title || e.company || e.description);
}

function parseEducation(section: string) {
  return chunkBlocks(section).map((block) => {
    const lines = block.split("\n").map(clean).filter(Boolean);
    const dated = parseDates(lines.join(" "));
    const degreeLine = lines.find((l) => /\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|mba|phd|b\.tech|m\.tech|bachelor|master|diploma)\b/i.test(l)) || "";
    const school = lines.find((l) => /university|college|institute|school/i.test(l)) || lines[0] || "";
    const field = degreeLine.replace(/\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|mba|phd|b\.tech|m\.tech|bachelor(?:'s)?|master(?:'s)?|diploma)\b/gi, "").replace(/in\s+/i, "").trim();
    const degree = (degreeLine.match(/\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|mba|phd|b\.tech|m\.tech|bachelor(?:'s)?|master(?:'s)?|diploma)\b/i) || [""])[0];
    return {
      id: id(),
      school: school === degreeLine ? school : school,
      degree,
      field,
      startDate: dated.startDate,
      endDate: dated.endDate,
    };
  }).filter((e) => e.school || e.degree);
}

function parseSkills(section: string) {
  return section
    .split(/[,;|•\n]/)
    .map(clean)
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 24);
}

function parseProjects(section: string) {
  return chunkBlocks(section).map((block) => {
    const lines = block.split("\n").map(clean).filter(Boolean);
    const url = lines.find((l) => /https?:\/\/|github\.com|gitlab\.com/i.test(l)) || "";
    return {
      id: id(),
      name: lines[0] || "",
      url: url.replace(/^.*?(https?:\/\/\S+|github\.com\S+)/i, "$1"),
      description: bulletsFrom(lines.slice(1).filter((l) => l !== url).join("\n")),
    };
  }).filter((p) => p.name);
}

function parseAwards(section: string) {
  return section
    .split("\n")
    .map(clean)
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const parts = line.split(/\s+[|·•-]\s+/);
      return { id: id(), title: parts[0] || line, issuer: parts[1] || "", date: parts[2] || "" };
    });
}

export function parseResumeText(text: string, fallback?: { fullName?: string; email?: string }): {
  content: ResumeContent;
  warnings: string[];
} {
  const warnings: string[] = [];
  const sections = splitSections(text);
  const personal = parseContact(sections.header || "", text);
  const experience = parseExperience(sections.experience || "");
  const education = parseEducation(sections.education || "");
  const skills = parseSkills(sections.skills || "");
  const projects = parseProjects(sections.projects || "");
  const awards = parseAwards(sections.awards || "");
  const summary = (sections.summary || "").split("\n").map(clean).filter(Boolean).join(" ");

  if (!personal.fullName && fallback?.fullName) personal.fullName = fallback.fullName;
  if (!personal.email && fallback?.email) personal.email = fallback.email;
  if (!personal.email) warnings.push("Could not find an email. Add it in Contact.");
  if (!experience.length) warnings.push("Experience looked empty — check the imported bullets.");
  if (!skills.length) warnings.push("No skills list found. Add a few keywords.");

  const base = createDefaultContent({
    fullName: personal.fullName,
    email: personal.email,
    id,
  });

  const content: ResumeContent = {
    ...base,
    personal: { ...base.personal, ...personal },
    summary,
    experience: experience.length ? experience : base.experience,
    education: education.length ? education : base.education,
    skills,
    projects,
    awards,
    sectionVisibility: {
      ...base.sectionVisibility,
      projects: projects.length > 0,
      awards: awards.length > 0,
    },
    sectionOrder: [
      "summary",
      "experience",
      "education",
      "skills",
      ...(projects.length ? (["projects"] as const) : []),
      ...(awards.length ? (["awards"] as const) : []),
    ],
  };

  return { content, warnings };
}

export function cloneContent(source: ResumeContent): ResumeContent {
  return {
    ...source,
    personal: { ...source.personal },
    experience: source.experience.map((e) => ({ ...e, id: id() })),
    education: source.education.map((e) => ({ ...e, id: id() })),
    skills: [...source.skills],
    projects: (source.projects || []).map((p) => ({ ...p, id: id() })),
    awards: (source.awards || []).map((a) => ({ ...a, id: id() })),
    customSections: (source.customSections || []).map((c) => ({ ...c, id: id() })),
    sectionOrder: [...source.sectionOrder],
    sectionVisibility: { ...source.sectionVisibility },
  };
}

export function contentLooksFilled(content: ResumeContent) {
  return Boolean(
    stripHtml(content.summary) ||
      content.skills.length ||
      content.experience.some((e) => e.title || e.company || stripHtml(e.description))
  );
}
