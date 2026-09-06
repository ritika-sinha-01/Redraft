import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;
  if (!token) {
    next();
    return;
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    req.user = undefined;
  }
  next();
}

export function cookieOptions() {
  const crossSite = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: (crossSite ? "none" : "lax") as "none" | "lax",
    secure: crossSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}
