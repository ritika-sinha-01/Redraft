import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { parseDesign, parseResumeContent, resumePlainText } from "../types/resume";
import { keywordAnalysis, scoreResume, suggestImprovements, suggestSummary } from "../services/intelligence";
import { analyzeResumeReport } from "../services/atsAnalyzer";
import type { ResumeContent } from "../types/resume";
import { availableProviders, llmChat, resolveLlm } from "../services/llm";
import { improveResumeContent, wantsResumeBuild } from "../services/improveResume";
import { contentLooksFilled, parseResumeText } from "../services/parseResume";

export const atsRouter = Router();
atsRouter.use(requireAuth);

atsRouter.post("/check", async (req, res, next) => {
  try {
    const { resumeId, jobDescription, content } = req.body as {
      resumeId?: string;
      jobDescription?: string;
      content?: ResumeContent;
    };
    let parsed = content;
    let slug = "classic";
    let fontFamily = "georgia";
    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: req.user!.userId },
        include: { template: true },
      });
      if (!resume) {
        res.status(404).json({ error: "Resume not found" });
        return;
      }
      parsed = parseResumeContent(resume.content);
      slug = resume.template.slug;
      fontFamily = parseDesign(resume.designPreferences).fontFamily;
    }
    if (!parsed) {
      res.status(400).json({ error: "Select a resume to analyse." });
      return;
    }
    const report = analyzeResumeReport(parsed, { slug, fontFamily, jobDescription });
    if (resumeId) {
      const jd = (jobDescription || "").trim();
      await prisma.atsRun.create({
        data: {
          userId: req.user!.userId,
          resumeId,
          score: report.score,
          report: JSON.stringify(report),
          label: jd ? jd.slice(0, 80) : "Quality check",
          jobDescription: jd,
        },
      });
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

atsRouter.get("/runs", async (req, res, next) => {
  try {
    const runs = await prisma.atsRun.findMany({
      where: { userId: req.user!.userId },
      include: { resume: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    res.json({
      runs: runs.map((r) => ({
        id: r.id,
        resumeId: r.resumeId,
        resumeTitle: r.resume.title,
        score: r.score,
        label: r.label,
        jobDescription: r.jobDescription,
        createdAt: r.createdAt,
        report: JSON.parse(r.report),
      })),
    });
  } catch (err) {
    next(err);
  }
});

atsRouter.get("/history/:resumeId", async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const runs = await prisma.atsRun.findMany({
      where: { resumeId: resume.id },
      include: { resume: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({
      runs: runs.map((r) => ({
        id: r.id,
        resumeId: r.resumeId,
        resumeTitle: r.resume.title,
        score: r.score,
        label: r.label,
        jobDescription: r.jobDescription,
        createdAt: r.createdAt,
        report: JSON.parse(r.report),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get("/status", (_req, res) => {
  const providers = availableProviders();
  res.json({
    providers,
    hasServerKey: providers.openai || providers.gemini || providers.anthropic,
  });
});

aiRouter.post("/chat", async (req, res, next) => {
  try {
    const { messages, resumeId } = req.body as {
      messages?: { role?: string; content?: string }[];
      resumeId?: string;
    };
    const history = (messages || [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
      .slice(-16)
      .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }));
    if (!history.length || history[history.length - 1].role !== "user") {
      res.status(400).json({ error: "Send a message to continue the conversation." });
      return;
    }
    const lastUser = history[history.length - 1].content;
    if (wantsResumeBuild(lastUser)) {
      const notes = history
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n");
      const built = await polishResumeForUser(req.user!.userId, resumeId, notes);
      res.json({
        reply: `${built.name}, I polished the resume and prepared a PDF. The download should start now — you can also open it in the editor to tweak layout.`,
        provider: "builtin",
        resumeId: built.id,
        title: built.title,
        downloadPdf: true,
      });
      return;
    }
    let resumeContext = "";
    let parsedResume = null as ReturnType<typeof parseResumeContent> | null;
    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: req.user!.userId },
      });
      if (resume) {
        parsedResume = parseResumeContent(resume.content);
        resumeContext = resumePlainText(parsedResume).slice(0, 4000);
      }
    }
    const llm = resolveLlm(req);
    const reply = await llmChat({
      provider: llm.provider,
      apiKey: llm.apiKey,
      resume: parsedResume,
      system:
        "You are a career writing assistant inside Redraft. Help with resumes, cover letters, interview answers, and job applications. Be specific and concise. Use the attached resume when it is provided. Do not invent employers or metrics the resume does not support.",
      messages: resumeContext
        ? [{ role: "user", content: `Resume for context:\n${resumeContext}` }, { role: "assistant", content: "I have the resume and will use it as reference." }, ...history]
        : history,
    });
    const provider = llm.apiKey && llm.provider !== "builtin" ? llm.provider : "builtin";
    res.json({ reply, provider });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/suggest", async (req, res, next) => {
  try {
    const { text } = req.body as { text?: string };
    res.json({ suggestions: suggestImprovements(text || "") });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/summary", async (req, res, next) => {
  try {
    const { resumeId, content } = req.body as { resumeId?: string; content?: ResumeContent };
    let parsed = content;
    if (!parsed && resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: req.user!.userId },
      });
      if (!resume) {
        res.status(404).json({ error: "Resume not found" });
        return;
      }
      parsed = parseResumeContent(resume.content);
    }
    if (!parsed) {
      res.status(400).json({ error: "Provide a resume or its content." });
      return;
    }
    res.json({ suggestions: suggestSummary(parsed) });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/keywords", async (req, res, next) => {
  try {
    const { resumeId, jobDescription } = req.body as { resumeId?: string; jobDescription?: string };
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.json(keywordAnalysis(jobDescription || "", parseResumeContent(resume.content)));
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/build", async (req, res, next) => {
  try {
    const { resumeId, notes } = req.body as { resumeId?: string; notes?: string };
    const built = await polishResumeForUser(req.user!.userId, resumeId, notes || "");
    res.json({
      resumeId: built.id,
      title: built.title,
      downloadPdf: true,
      reply: `${built.name}, I polished the resume. Download the PDF or open it in the editor.`,
    });
  } catch (err) {
    next(err);
  }
});

async function polishResumeForUser(userId: string, resumeId: string | undefined, notes: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  let row = resumeId
    ? await prisma.resume.findFirst({ where: { id: resumeId, userId } })
    : await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });

  let content: ResumeContent;
  if (row) {
    content = parseResumeContent(row.content);
    if (!contentLooksFilled(content) && notes.trim().length > 40) {
      content = parseResumeText(notes, { fullName: user?.name, email: user?.email }).content;
    }
    content = improveResumeContent(content);
    await prisma.resumeVersion.create({
      data: {
        resumeId: row.id,
        label: "Before AI polish",
        snapshot: JSON.stringify({
          title: row.title,
          templateId: row.templateId,
          content: parseResumeContent(row.content),
          designPreferences: parseDesign(row.designPreferences),
          layoutPreferences: {},
        }),
      },
    });
    row = await prisma.resume.update({
      where: { id: row.id },
      data: { content: JSON.stringify(content) },
    });
  } else {
    const parsed = parseResumeText(notes, { fullName: user?.name, email: user?.email });
    content = improveResumeContent(parsed.content);
    const template = await prisma.template.findFirst({ where: { isPremium: false }, orderBy: { name: "asc" } });
    if (!template) throw Object.assign(new Error("No template available to build a resume."), { status: 500 });
    row = await prisma.resume.create({
      data: {
        userId,
        templateId: template.id,
        title: user?.name ? `${user.name} resume` : "AI resume",
        content: JSON.stringify(content),
      },
    });
  }

  const name = content.personal.fullName.split(" ")[0] || user?.name?.split(" ")[0] || "Done";
  return { id: row.id, title: row.title, name };
}

aiRouter.get("/scores/:resumeId", async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.json(scoreResume(parseResumeContent(resume.content)));
  } catch (err) {
    next(err);
  }
});
