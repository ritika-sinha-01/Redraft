export const env = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-resume-analysis-secret-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5174",
};
