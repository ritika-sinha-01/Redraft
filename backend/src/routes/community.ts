import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { parseResumeContent } from "../types/resume";

export const communityRouter = Router();
communityRouter.use(requireAuth);

communityRouter.get("/queue", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: "OPEN", isProfessional: false, revieweeId: { not: req.user!.userId } },
      include: {
        resume: { select: { id: true, title: true, content: true } },
        reviewee: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    res.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        title: r.resume.title,
        owner: r.reviewee.name,
        preview: parseResumeContent(r.resume.content).summary.slice(0, 180),
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

communityRouter.get("/mine", async (req, res, next) => {
  try {
    const given = await prisma.review.findMany({
      where: { reviewerId: req.user!.userId, status: "COMPLETED" },
      include: { resume: { select: { title: true } }, reviewee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const received = await prisma.review.findMany({
      where: { revieweeId: req.user!.userId },
      include: { resume: { select: { title: true } }, reviewer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ given, received });
  } catch (err) {
    next(err);
  }
});

communityRouter.post("/submit", async (req, res, next) => {
  try {
    const { resumeId } = req.body as { resumeId?: string };
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const review = await prisma.review.create({
      data: {
        resumeId: resume.id,
        revieweeId: req.user!.userId,
        isProfessional: false,
        status: "OPEN",
      },
    });
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

communityRouter.post("/:id/feedback", async (req, res, next) => {
  try {
    const { feedback } = req.body as { feedback?: string };
    if (!feedback?.trim()) {
      res.status(400).json({ error: "Feedback is required" });
      return;
    }
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review || review.status !== "OPEN" || review.revieweeId === req.user!.userId) {
      res.status(404).json({ error: "Review not available" });
      return;
    }
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        feedback: feedback.trim(),
        reviewerId: req.user!.userId,
        status: "COMPLETED",
      },
    });
    res.json({ review: updated });
  } catch (err) {
    next(err);
  }
});

communityRouter.post("/professional", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!(user?.role === "PREMIUM" && user.subscriptionStatus === "ACTIVE")) {
      res.status(403).json({ error: "Professional review is a premium feature." });
      return;
    }
    const { resumeId } = req.body as { resumeId?: string };
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    const content = parseResumeContent(resume.content);
    const notes = [
      content.summary.length < 80 ? "Tighten the summary into 2–3 outcome-led sentences." : "Summary is a solid snapshot of your positioning.",
      content.experience.some((e) => !/\d/.test(e.description))
        ? "Add measurable impact (%, $, time saved) to at least two bullets."
        : "Metrics are present — keep leading with them.",
      content.skills.length < 6 ? "Expand skills so ATS keyword matching is stronger." : "Skills coverage looks healthy.",
    ].join(" ");
    const review = await prisma.review.create({
      data: {
        resumeId: resume.id,
        revieweeId: req.user!.userId,
        reviewerId: req.user!.userId,
        isProfessional: true,
        status: "COMPLETED",
        feedback: `Expert review: ${notes}`,
      },
    });
    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});
