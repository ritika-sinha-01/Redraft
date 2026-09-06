import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { authRouter } from "./routes/auth";
import { templatesRouter } from "./routes/templates";
import { resumesRouter } from "./routes/resumes";
import { shareRouter } from "./routes/share";
import { atsRouter, aiRouter } from "./routes/intelligence";
import { communityRouter } from "./routes/community";
import { billingRouter, jobsRouter, portfolioRouter } from "./routes/billing";
import { coverLettersRouter } from "./routes/coverLetters";

const app = express();

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  const clean = origin.replace(/\/$/, "");
  if (env.clientOrigins.includes(clean)) return true;
  try {
    const host = new URL(clean).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-llm-provider", "x-llm-key"],
  })
);
app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/resumes", resumesRouter);
app.use("/api/share", shareRouter);
app.use("/api/ats", atsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/cover-letters", coverLettersRouter);
app.use("/api/community", communityRouter);
app.use("/api/billing", billingRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/portfolio", portfolioRouter);

const frontendDist = path.resolve(process.cwd(), "../frontend/dist");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

if (!existsSync(frontendDist)) {
  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "Redraft API", health: "/api/health" });
  });
}

app.use(errorHandler);

try {
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
} catch (err) {
  console.error("Prisma db push failed", err);
}

app.listen(env.port, () => {
  console.log(`Redraft API listening on http://localhost:${env.port}`);
});

