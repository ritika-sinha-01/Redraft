import { Router } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { parseDesign, parseLayout, parseResumeContent } from "../types/resume";

export const shareRouter = Router();

shareRouter.get("/public/:token", async (req, res, next) => {
  try {
    const link = await prisma.sharedLink.findUnique({
      where: { token: req.params.token },
      include: {
        resume: { include: { template: { select: { slug: true, name: true } }, user: { select: { name: true } } } },
      },
    });
    if (!link || link.revokedAt || !link.isPublic) {
      res.status(404).json({ error: "This resume is private or the link was revoked." });
      return;
    }
    await prisma.sharedLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    });
    res.json({
      resume: {
        title: link.resume.title,
        content: parseResumeContent(link.resume.content),
        designPreferences: parseDesign(link.resume.designPreferences),
        layoutPreferences: parseLayout(link.resume.layoutPreferences),
        template: link.resume.template,
        ownerName: link.resume.user.name,
      },
      viewCount: link.viewCount + 1,
    });
  } catch (err) {
    next(err);
  }
});

shareRouter.use(requireAuth);

shareRouter.get("/:resumeId", async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const links = await prisma.sharedLink.findMany({
      where: { resumeId: resume.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

shareRouter.post("/:resumeId", async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const token = randomBytes(9).toString("base64url");
    const link = await prisma.sharedLink.create({
      data: { resumeId: resume.id, token, isPublic: true },
    });
    await prisma.resume.update({
      where: { id: resume.id },
      data: { shareSlug: token, isPublic: true },
    });
    res.status(201).json({ link });
  } catch (err) {
    next(err);
  }
});

shareRouter.patch("/:token", async (req, res, next) => {
  try {
    const { isPublic } = req.body as { isPublic?: boolean };
    const link = await prisma.sharedLink.findUnique({
      where: { token: req.params.token },
      include: { resume: true },
    });
    if (!link || link.resume.userId !== req.user!.userId) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    const updated = await prisma.sharedLink.update({
      where: { id: link.id },
      data: { isPublic: Boolean(isPublic) },
    });
    await prisma.resume.update({
      where: { id: link.resumeId },
      data: { isPublic: Boolean(isPublic) },
    });
    res.json({ link: updated });
  } catch (err) {
    next(err);
  }
});

shareRouter.delete("/:token", async (req, res, next) => {
  try {
    const link = await prisma.sharedLink.findUnique({
      where: { token: req.params.token },
      include: { resume: true },
    });
    if (!link || link.resume.userId !== req.user!.userId) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    const updated = await prisma.sharedLink.update({
      where: { id: link.id },
      data: { revokedAt: new Date(), isPublic: false },
    });
    await prisma.resume.update({
      where: { id: link.resumeId },
      data: { isPublic: false },
    });
    res.json({ link: updated });
  } catch (err) {
    next(err);
  }
});
