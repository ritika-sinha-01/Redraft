import { Router } from "express";
import { prisma } from "../lib/prisma";

export const templatesRouter = Router();

templatesRouter.get("/", async (_req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ isPremium: "asc" }, { name: "asc" }],
    });
    res.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        thumbnail: t.thumbnail,
        isPremium: t.isPremium,
        layoutConfig: JSON.parse(t.layoutConfig || "{}"),
      })),
    });
  } catch (err) {
    next(err);
  }
});
