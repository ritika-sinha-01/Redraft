import { Router } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  createDefaultContent,
  parseDesign,
  parseLayout,
  parseResumeContent,
  type ResumeContent,
} from "../types/resume";
import { cloneContent, extractPlainText, parseResumeText } from "../services/parseResume";
import { renderResumeHtml } from "../services/export/html";
import { renderPdf } from "../services/export/pdf";
import { renderPpt } from "../services/export/ppt";

export const resumesRouter = Router();
resumesRouter.use(requireAuth);

function serialize(resume: {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  content: string;
  designPreferences: string;
  layoutPreferences: string;
  shareSlug: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  template?: { slug: string; name: string; isPremium?: boolean };
}) {
  return {
    id: resume.id,
    userId: resume.userId,
    templateId: resume.templateId,
    title: resume.title,
    content: parseResumeContent(resume.content),
    designPreferences: parseDesign(resume.designPreferences),
    layoutPreferences: parseLayout(resume.layoutPreferences),
    shareSlug: resume.shareSlug,
    isPublic: resume.isPublic,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    template: resume.template,
  };
}

async function snapshot(resumeId: string, payload: unknown, label = "") {
  await prisma.resumeVersion.create({
    data: { resumeId, snapshot: JSON.stringify(payload), label },
  });
  const extras = await prisma.resumeVersion.findMany({
    where: { resumeId },
    orderBy: { createdAt: "desc" },
    skip: 20,
    select: { id: true },
  });
  if (extras.length) {
    await prisma.resumeVersion.deleteMany({ where: { id: { in: extras.map((e) => e.id) } } });
  }
}

resumesRouter.get("/", async (req, res, next) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.user!.userId },
      include: {
        template: { select: { slug: true, name: true, isPremium: true } },
        _count: { select: { versions: true, atsRuns: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({
      resumes: resumes.map((r) => ({
        ...serialize(r),
        versionCount: r._count.versions,
        atsRunCount: r._count.atsRuns,
      })),
    });
  } catch (err) {
    next(err);
  }
});

resumesRouter.post("/parse", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const text = await extractPlainText(req.body as { filename?: string; mimeType?: string; base64?: string; text?: string });
    if (!text.trim()) {
      res.status(400).json({ error: "Could not read any text from that file." });
      return;
    }
    const parsed = parseResumeText(text, { fullName: user?.name, email: user?.email });
    res.json(parsed);
  } catch (err) {
    next(err);
  }
});

resumesRouter.post("/", async (req, res, next) => {
  try {
    const { templateId, title, content: incoming, sourceResumeId } = req.body as {
      templateId?: string;
      title?: string;
      content?: ResumeContent;
      sourceResumeId?: string;
    };
    if (!templateId) {
      res.status(400).json({ error: "templateId is required" });
      return;
    }
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (template.isPremium && !(user?.role === "PREMIUM" && user.subscriptionStatus === "ACTIVE")) {
      res.status(403).json({ error: "Premium template. Upgrade to use it." });
      return;
    }

    let content = createDefaultContent({
      fullName: user?.name,
      email: user?.email,
      id: () => randomUUID(),
    });

    if (sourceResumeId) {
      const source = await prisma.resume.findFirst({
        where: { id: sourceResumeId, userId: req.user!.userId },
      });
      if (!source) {
        res.status(404).json({ error: "Source resume not found" });
        return;
      }
      content = cloneContent(parseResumeContent(source.content));
    } else if (incoming) {
      content = cloneContent(parseResumeContent(JSON.stringify(incoming)));
    }

    const resume = await prisma.resume.create({
      data: {
        userId: req.user!.userId,
        templateId,
        title: title?.trim() || "Untitled Resume",
        content: JSON.stringify(content),
      },
      include: { template: { select: { slug: true, name: true, isPremium: true } } },
    });
    res.status(201).json({ resume: serialize(resume) });
  } catch (err) {
    next(err);
  }
});

resumesRouter.get("/:id", async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { template: { select: { slug: true, name: true, isPremium: true } } },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.json({ resume: serialize(resume) });
  } catch (err) {
    next(err);
  }
});

resumesRouter.put("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    await snapshot(existing.id, {
      title: existing.title,
      templateId: existing.templateId,
      content: parseResumeContent(existing.content),
      designPreferences: parseDesign(existing.designPreferences),
      layoutPreferences: parseLayout(existing.layoutPreferences),
    });
    const { title, content, templateId, designPreferences, layoutPreferences } = req.body as {
      title?: string;
      content?: unknown;
      templateId?: string;
      designPreferences?: unknown;
      layoutPreferences?: unknown;
    };
    if (templateId) {
      const template = await prisma.template.findUnique({ where: { id: templateId } });
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
      if (
        template?.isPremium &&
        !(user?.role === "PREMIUM" && user.subscriptionStatus === "ACTIVE")
      ) {
        res.status(403).json({ error: "Premium template. Upgrade to use it." });
        return;
      }
    }
    const resume = await prisma.resume.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content: JSON.stringify(content) } : {}),
        ...(templateId !== undefined ? { templateId } : {}),
        ...(designPreferences !== undefined
          ? { designPreferences: JSON.stringify(designPreferences) }
          : {}),
        ...(layoutPreferences !== undefined
          ? { layoutPreferences: JSON.stringify(layoutPreferences) }
          : {}),
      },
      include: { template: { select: { slug: true, name: true, isPremium: true } } },
    });
    res.json({ resume: serialize(resume) });
  } catch (err) {
    next(err);
  }
});

resumesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    await prisma.resume.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

resumesRouter.get("/:id/versions", async (req, res, next) => {
  try {
    const existing = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const versions = await prisma.resumeVersion.findMany({
      where: { resumeId: existing.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({
      versions: versions.map((v) => ({
        id: v.id,
        label: v.label,
        createdAt: v.createdAt,
        snapshot: JSON.parse(v.snapshot),
      })),
    });
  } catch (err) {
    next(err);
  }
});

resumesRouter.post("/:id/versions", async (req, res, next) => {
  try {
    const existing = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const { label } = req.body as { label?: string };
    await snapshot(
      existing.id,
      {
        title: existing.title,
        templateId: existing.templateId,
        content: parseResumeContent(existing.content),
        designPreferences: parseDesign(existing.designPreferences),
        layoutPreferences: parseLayout(existing.layoutPreferences),
      },
      label?.trim() || "Manual save"
    );
    const versions = await prisma.resumeVersion.findMany({
      where: { resumeId: existing.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.status(201).json({
      versions: versions.map((v) => ({ id: v.id, label: v.label, createdAt: v.createdAt })),
    });
  } catch (err) {
    next(err);
  }
});

resumesRouter.post("/:id/versions/:versionId/revert", async (req, res, next) => {
  try {
    const existing = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const version = await prisma.resumeVersion.findFirst({
      where: { id: req.params.versionId, resumeId: existing.id },
    });
    if (!version) {
      res.status(404).json({ error: "Version not found" });
      return;
    }
    const snap = JSON.parse(version.snapshot) as {
      title?: string;
      templateId?: string;
      content?: unknown;
      designPreferences?: unknown;
      layoutPreferences?: unknown;
    };
    await snapshot(existing.id, {
      title: existing.title,
      templateId: existing.templateId,
      content: parseResumeContent(existing.content),
      designPreferences: parseDesign(existing.designPreferences),
      layoutPreferences: parseLayout(existing.layoutPreferences),
    });
    const resume = await prisma.resume.update({
      where: { id: existing.id },
      data: {
        title: snap.title ?? existing.title,
        templateId: snap.templateId ?? existing.templateId,
        content: JSON.stringify(snap.content ?? parseResumeContent(existing.content)),
        designPreferences: JSON.stringify(snap.designPreferences ?? {}),
        layoutPreferences: JSON.stringify(snap.layoutPreferences ?? {}),
      },
      include: { template: { select: { slug: true, name: true, isPremium: true } } },
    });
    res.json({ resume: serialize(resume) });
  } catch (err) {
    next(err);
  }
});

resumesRouter.post("/:id/export", async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { template: true },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const format = (req.body as { format?: string })?.format;
    if (format !== "pdf" && format !== "ppt") {
      res.status(400).json({ error: "format must be pdf or ppt" });
      return;
    }
    const content = parseResumeContent(resume.content);
    const design = parseDesign(resume.designPreferences);
    const layout = parseLayout(resume.layoutPreferences);
    const safeName = (resume.title || "resume").replace(/[^\w\s-]/g, "").trim() || "resume";

    if (format === "pdf") {
      const html = renderResumeHtml(content, resume.template.slug, design, layout);
      const buffer = await renderPdf(html);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
      res.send(buffer);
      return;
    }

    const buffer = await renderPpt(content, resume.title);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pptx"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
