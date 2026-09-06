import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { publicUser } from "../lib/user";
import { JOBS } from "../data/jobs";
import { parseDesign, parseResumeContent } from "../types/resume";
import { findLiveJobs } from "../services/liveJobs";
import { tailorResumeToJob } from "../services/tailorResume";
import { analyzeResumeReport } from "../services/atsAnalyzer";
import { resolveLlm } from "../services/llm";
import {
  DEFAULT_COVER_CONTENT,
  DEFAULT_COVER_DESIGN,
  generateCoverLetter,
} from "../services/coverLetter";

const APP_STATUSES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"] as const;

function normalizeStatus(status: string) {
  if (status === "DRAFT") return "SAVED";
  if (status === "SUBMITTED") return "APPLIED";
  return APP_STATUSES.includes(status as (typeof APP_STATUSES)[number]) ? status : "SAVED";
}

function serializeApplication(row: {
  id: string;
  userId: string;
  resumeId: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  status: string;
  notes: string;
  followUpAt: Date | null;
  jobDescription: string;
  coverLetterId: string | null;
  createdAt: Date;
  updatedAt: Date;
  resume?: { title: string };
}) {
  return {
    ...row,
    status: normalizeStatus(row.status),
  };
}

export const billingRouter = Router();
billingRouter.use(requireAuth);

billingRouter.get("/status", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      user: publicUser(user),
      subscription: sub,
      pricing: {
        currency: "INR",
        amount: 999,
        period: "month",
        display: "₹999 / mo",
        note: "Priced in Indian rupees (converted from $12 USD).",
      },
      features: {
        free: ["4+ core templates", "PDF & PPT export", "Live preview", "ATS analyser"],
        premium: [
          "All 12 templates",
          "Custom accent colors & extra fonts",
          "Professional review",
          "Portfolio builder",
          "Priority export styling",
        ],
      },
    });
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/subscribe", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: "PREMIUM", subscriptionStatus: "ACTIVE" },
    });
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "PREMIUM",
        status: "ACTIVE",
        provider: "demo",
      },
    });
    res.json({ user: publicUser(user), subscription: sub });
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/checkout", async (req, res, next) => {
  try {
    const { method, upiId, last4, bank, name } = req.body as {
      method?: string;
      upiId?: string;
      last4?: string;
      bank?: string;
      name?: string;
    };
    const payMethod = method || "";
    if (!["upi", "card", "netbanking"].includes(payMethod)) {
      res.status(400).json({ error: "Choose UPI, card, or net banking." });
      return;
    }
    if (payMethod === "upi" && !/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(upiId || "")) {
      res.status(400).json({ error: "Enter a valid UPI ID, like name@oksbi." });
      return;
    }
    if (payMethod === "card" && !/^\d{4}$/.test(last4 || "")) {
      res.status(400).json({ error: "Card details look incomplete." });
      return;
    }
    if (payMethod === "netbanking" && !(bank || "").trim()) {
      res.status(400).json({ error: "Select a bank." });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: "PREMIUM", subscriptionStatus: "ACTIVE" },
    });
    await prisma.subscription.create({
      data: { userId: user.id, plan: "PREMIUM", status: "ACTIVE", provider: "inr-checkout" },
    });
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 999,
        currency: "INR",
        method: payMethod,
        status: "PAID",
        last4: last4 || "",
        upiId: upiId || "",
        bank: bank || name || "",
      },
    });
    res.json({
      user: publicUser(user),
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
      },
      receipt: `₹999 paid via ${payMethod.toUpperCase()}. Premium is active.`,
    });
  } catch (err) {
    next(err);
  }
});

billingRouter.get("/payments", async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

billingRouter.post("/cancel", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { role: "USER", subscriptionStatus: "CANCELED" },
    });
    await prisma.subscription.updateMany({
      where: { userId: user.id, status: "ACTIVE" },
      data: { status: "CANCELED" },
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export const jobsRouter = Router();
jobsRouter.use(requireAuth);

jobsRouter.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q || "");
    const location = String(req.query.location || "");
    const resumeId = String(req.query.resumeId || "");
    let content = null;
    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: req.user!.userId },
      });
      if (resume) content = parseResumeContent(resume.content);
    }
    const live = await findLiveJobs({ content, q, location });
    res.json(live);
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/apply", async (req, res, next) => {
  try {
    const { resumeId, jobTitle, company, jobUrl, jobDescription } = req.body as {
      resumeId?: string;
      jobTitle?: string;
      company?: string;
      jobUrl?: string;
      jobDescription?: string;
    };
    if (!jobTitle || !company) {
      res.status(400).json({ error: "Job title and company are required." });
      return;
    }
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(400).json({ error: "Select a resume to apply with." });
      return;
    }
    const application = await prisma.jobApplication.create({
      data: {
        userId: req.user!.userId,
        resumeId: resume.id,
        jobTitle,
        company,
        jobUrl: jobUrl || "",
        jobDescription: jobDescription || "",
        status: "APPLIED",
      },
    });
    res.status(201).json({ application: serializeApplication(application) });
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/tailor", async (req, res, next) => {
  try {
    const { resumeId, jobTitle, company, jobUrl, jobDescription } = req.body as {
      resumeId?: string;
      jobTitle?: string;
      company?: string;
      jobUrl?: string;
      jobDescription?: string;
    };
    if (!resumeId || !jobTitle || !company) {
      res.status(400).json({ error: "Pick a resume, role, and company." });
      return;
    }
    const source = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
      include: { template: true },
    });
    if (!source) {
      res.status(400).json({ error: "Select a resume to tailor." });
      return;
    }
    const tailored = tailorResumeToJob(parseResumeContent(source.content), {
      role: jobTitle,
      company,
      jobDescription,
    });
    const resume = await prisma.resume.create({
      data: {
        userId: req.user!.userId,
        templateId: source.templateId,
        title: `${jobTitle} · ${company}`,
        content: JSON.stringify(tailored),
        designPreferences: source.designPreferences,
        layoutPreferences: source.layoutPreferences,
      },
      include: { template: { select: { slug: true, name: true } } },
    });
    const design = parseDesign(resume.designPreferences);
    const report = analyzeResumeReport(tailored, {
      slug: resume.template.slug,
      fontFamily: design.fontFamily,
      jobDescription,
    });
    await prisma.atsRun.create({
      data: {
        userId: req.user!.userId,
        resumeId: resume.id,
        score: report.score,
        report: JSON.stringify(report),
        label: `${jobTitle} · ${company}`,
        jobDescription: jobDescription || "",
      },
    });
    const llm = resolveLlm(req);
    const letterContent = await generateCoverLetter({
      provider: llm.provider,
      apiKey: llm.apiKey,
      resume: tailored,
      company,
      role: jobTitle,
      jobDescription: jobDescription || "",
    });
    if (tailored.personal.fullName && !letterContent.senderName) letterContent.senderName = tailored.personal.fullName;
    const letter = await prisma.coverLetter.create({
      data: {
        userId: req.user!.userId,
        resumeId: resume.id,
        title: `${jobTitle} · ${company}`,
        company,
        role: jobTitle,
        jobDescription: jobDescription || "",
        content: JSON.stringify(letterContent || DEFAULT_COVER_CONTENT),
        design: JSON.stringify(DEFAULT_COVER_DESIGN),
      },
    });
    const application = await prisma.jobApplication.create({
      data: {
        userId: req.user!.userId,
        resumeId: resume.id,
        jobTitle,
        company,
        jobUrl: jobUrl || "",
        jobDescription: jobDescription || "",
        coverLetterId: letter.id,
        status: "SAVED",
      },
      include: { resume: { select: { title: true } } },
    });
    res.status(201).json({
      resume: { id: resume.id, title: resume.title },
      letterId: letter.id,
      application: serializeApplication(application),
      report,
    });
  } catch (err) {
    next(err);
  }
});

jobsRouter.get("/applications", async (req, res, next) => {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: { userId: req.user!.userId },
      include: { resume: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ applications: applications.map(serializeApplication) });
  } catch (err) {
    next(err);
  }
});

jobsRouter.patch("/applications/:id", async (req, res, next) => {
  try {
    const existing = await prisma.jobApplication.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    const { status, notes, followUpAt } = req.body as {
      status?: string;
      notes?: string;
      followUpAt?: string | null;
    };
    const nextStatus = status ? normalizeStatus(status) : normalizeStatus(existing.status);
    if (status && !APP_STATUSES.includes(nextStatus as (typeof APP_STATUSES)[number])) {
      res.status(400).json({ error: "Use Saved, Applied, Interview, Offer, or Rejected." });
      return;
    }
    const application = await prisma.jobApplication.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        notes: notes != null ? String(notes) : existing.notes,
        followUpAt: followUpAt === undefined ? existing.followUpAt : followUpAt ? new Date(followUpAt) : null,
      },
      include: { resume: { select: { title: true } } },
    });
    res.json({ application: serializeApplication(application) });
  } catch (err) {
    next(err);
  }
});

jobsRouter.delete("/applications/:id", async (req, res, next) => {
  try {
    const existing = await prisma.jobApplication.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    await prisma.jobApplication.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

jobsRouter.post("/:id/apply", async (req, res, next) => {
  try {
    const job = JOBS.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const { resumeId } = req.body as { resumeId?: string };
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
    });
    if (!resume) {
      res.status(400).json({ error: "Select a resume to apply with." });
      return;
    }
    const application = await prisma.jobApplication.create({
      data: {
        userId: req.user!.userId,
        resumeId: resume.id,
        jobTitle: job.title,
        company: job.company,
        jobUrl: `https://jobs.example/${job.id}`,
        status: "APPLIED",
      },
    });
    res.status(201).json({ application });
  } catch (err) {
    next(err);
  }
});

export const portfolioRouter = Router();
portfolioRouter.use(requireAuth);

portfolioRouter.get("/", async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId: req.user!.userId },
    });
    res.json({
      portfolio: portfolio
        ? { ...portfolio, data: JSON.parse(portfolio.data || "{}") }
        : { title: "My Portfolio", data: { headline: "", bio: "", items: [] } },
    });
  } catch (err) {
    next(err);
  }
});

portfolioRouter.put("/", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!(user?.role === "PREMIUM" && user.subscriptionStatus === "ACTIVE")) {
      res.status(403).json({ error: "Portfolio builder is a premium feature. You can still add a URL on the resume." });
      return;
    }
    const { title, data } = req.body as { title?: string; data?: unknown };
    const existing = await prisma.portfolio.findFirst({ where: { userId: req.user!.userId } });
    const payload = {
      title: title || "My Portfolio",
      data: JSON.stringify(data || {}),
    };
    const portfolio = existing
      ? await prisma.portfolio.update({ where: { id: existing.id }, data: payload })
      : await prisma.portfolio.create({ data: { userId: req.user!.userId, ...payload } });
    res.json({ portfolio: { ...portfolio, data: JSON.parse(portfolio.data) } });
  } catch (err) {
    next(err);
  }
});
