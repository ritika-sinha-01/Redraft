function originsFromEnv() {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:5174";
  const listed = raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const extras = ["http://localhost:5174", "https://redraft-indol.vercel.app"];
  return [...new Set([...listed, ...extras])];
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-resume-analysis-secret-change-me",
  clientOrigin: (process.env.CLIENT_ORIGIN || "http://localhost:5174").trim().replace(/\/$/, ""),
  clientOrigins: originsFromEnv(),
  googleClientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
};
