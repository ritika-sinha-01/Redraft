import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { parseResumeContent } from "../types/resume";
import { resolveLlm } from "../services/llm";
import {
  DEFAULT_COVER_CONTENT,
  DEFAULT_COVER_DESIGN,
  generateCoverLetter,
  parseCoverContent,
  parseCoverDesign,
  renderCoverDocx,
  renderCoverHtml,
} from "../services/coverLetter";
import { renderPdf } from "../services/export/pdf";

export const coverLettersRouter = Router();
coverLettersRouter.use(requireAuth);

function serialize(row: {
  id: string;
  userId: string;
  resumeId: string | null;
  title: string;
  company: string;
  role: string;
  jobDescription: string;
  content: string;
  design: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    content: parseCoverContent(row.content),
    design: parseCoverDesign(row.design),
  };
}

coverLettersRouter.get("/", async (req, res, next) => {
  try {
    const letters = await prisma.coverLetter.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ letters: letters.map(serialize) });
  } catch (err) {
    next(err);
  }
});

coverLettersRouter.post("/", async (req, res, next) => {
  try {
    const { resumeId, company, role, jobDescription, title } = req.body as {
      resumeId?: string;
      company?: string;
      role?: string;
      jobDescription?: string;
      title?: string;
    };
    const resume = resumeId
      ? await prisma.resume.findFirst({ where: { id: resumeId, userId: req.user!.userId } })
      : await prisma.resume.findFirst({ where: { userId: req.user!.userId }, orderBy: { updatedAt: "desc" } });
    const parsed = resume ? parseResumeContent(resume.content) : null;
    const llm = resolveLlm(req);
    const content = parsed
      ? await generateCoverLetter({
          provider: llm.provider,
          apiKey: llm.apiKey,
          resume: parsed,
          company: company || "",
          role: role || "",
          jobDescription: jobDescription || "",
        })
      : {
          ...DEFAULT_COVER_CONTENT,
          senderName: "",
          paragraphs: ["Add a resume first, or write your letter here."],
        };
    if (parsed?.personal.fullName && !content.senderName) content.senderName = parsed.personal.fullName;
    const letter = await prisma.coverLetter.create({
      data: {
        userId: req.user!.userId,
        resumeId: resume?.id,
        title: title?.trim() || `${role || "Cover letter"}${company ? ` · ${company}` : ""}`,
        company: company || "",
        role: role || "",
        jobDescription: jobDescription || "",
        content: JSON.stringify(content),
        design: JSON.stringify(DEFAULT_COVER_DESIGN),
      },
    });
    res.status(201).json({ letter: serialize(letter) });
  } catch (err) {
    next(err);
  }
});

coverLettersRouter.get("/:id", async (req, res, next) => {
  try {
    const letter = await prisma.coverLetter.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!letter) {
      res.status(404).json({ error: "Cover letter not found" });
      return;
    }
    res.json({ letter: serialize(letter) });
  } catch (err) {
    next(err);
  }
});

coverLettersRouter.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.coverLetter.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Cover letter not found" });
      return;
    }
    const { title, company, role, jobDescription, content, design, resumeId } = req.body as Record<string, unknown>;
    const letter = await prisma.coverLetter.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(company !== undefined ? { company: String(company) } : {}),
        ...(role !== undefined ? { role: String(role) } : {}),
        ...(jobDescription !== undefined ? { jobDescription: String(jobDescription) } : {}),
        ...(resumeId !== undefined ? { resumeId: resumeId ? String(resumeId) : null } : {}),
        ...(content !== undefined ? { content: JSON.stringify(content) } : {}),
        ...(design !== undefined ? { design: JSON.stringify(design) } : {}),
      },
    });
    res.json({ letter: serialize(letter) });
  } catch (err) {
    next(err);
  }
});

coverLettersRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.coverLetter.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Cover letter not found" });
      return;
    }
    await prisma.coverLetter.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

coverLettersRouter.post("/:id/regenerate", async (req, res, next) => {
  try {
    const existing = await prisma.coverLetter.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Cover letter not found" });
      return;
    }
    const resume = existing.resumeId
      ? await prisma.resume.findFirst({ where: { id: existing.resumeId, userId: req.user!.userId } })
      : null;
    if (!resume) {
      res.status(400).json({ error: "Attach a resume before regenerating." });
      return;
    }
    const llm = resolveLlm(req);
    const content = await generateCoverLetter({
      provider: llm.provider,
      apiKey: llm.apiKey,
      resume: parseResumeContent(resume.content),
      company: existing.company,
      role: existing.role,
      jobDescription: existing.jobDescription,
    });
    const letter = await prisma.coverLetter.update({
      where: { id: existing.id },
      data: { content: JSON.stringify(content) },
    });
    res.json({ letter: serialize(letter) });
  } catch (err) {
    next(err);
  }
});

coverLettersRouter.post("/:id/export", async (req, res, next) => {
  try {
    const existing = await prisma.coverLetter.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Cover letter not found" });
      return;
    }
    const content = parseCoverContent(existing.content);
    const design = parseCoverDesign(existing.design);
    const resume = existing.resumeId
      ? await prisma.resume.findFirst({ where: { id: existing.resumeId, userId: req.user!.userId } })
      : null;
    const personal = resume ? parseResumeContent(resume.content).personal : { email: "", phone: "", location: "" };
    const { format } = req.body as { format?: string };
    const safe = (existing.title || "cover-letter").replace(/[^\w\- ]+/g, "").trim() || "cover-letter";
    if (format === "docx") {
      const buf = await renderCoverDocx(content, { role: existing.role, company: existing.company });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${safe}.docx"`);
      res.send(buf);
      return;
    }
    const html = renderCoverHtml(content, design, {
      company: existing.company,
      role: existing.role,
      email: personal.email,
      phone: personal.phone,
      location: personal.location,
    });
    const pdf = await renderPdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safe}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});
