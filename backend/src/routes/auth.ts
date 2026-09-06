import { Router } from "express";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, signToken, cookieOptions } from "../middleware/auth";
import { publicUser } from "../lib/user";
import { env } from "../config/env";
import { verifyGoogleIdToken } from "../services/googleAuth";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  subscriptionStatus: true,
  googleId: true,
  passwordSet: true,
} as const;

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !password || !name) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
      },
    });
    const token = signToken({ userId: user.id, email: user.email });
    res.cookie("token", token, cookieOptions());
    res.status(201).json({ user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (!user.passwordSet) {
      res.status(401).json({ error: "This account uses Google. Click Continue with Google." });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email });
    res.cookie("token", token, cookieOptions());
    res.json({ user: publicUser(user), token });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { ...cookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

authRouter.get("/google", (_req, res) => {
  res.json({ clientId: env.googleClientId, enabled: Boolean(env.googleClientId) });
});

authRouter.post("/google", async (req, res, next) => {
  try {
    if (!env.googleClientId) {
      res.status(503).json({ error: "Google sign-in is not configured yet." });
      return;
    }
    const { idToken } = req.body as { idToken?: string };
    if (!idToken) {
      res.status(400).json({ error: "Google did not return a sign-in token." });
      return;
    }
    const profile = await verifyGoogleIdToken(idToken);
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
          passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
          passwordSet: false,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    }
    const token = signToken({ userId: user.id, email: user.email });
    res.cookie("token", token, cookieOptions());
    res.json({ user: publicUser(user), token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sign in with Google";
    if (message.includes("GOOGLE_CLIENT_ID") || message.includes("verified email")) {
      res.status(401).json({ error: message });
      return;
    }
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: userSelect,
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.put("/me", requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required." });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name: name.trim() },
      select: userSelect,
    });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new password are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    if (!user.passwordSet) {
      res.status(400).json({ error: "This account uses Google. There is no password to change." });
      return;
    }
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Current password is wrong." });
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const email = String((req.body as { email?: string }).email || "")
      .toLowerCase()
      .trim();
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "No account with that email." });
      return;
    }
    if (!user.passwordSet) {
      res.status(400).json({ error: "This account uses Google. Sign in with Google instead." });
      return;
    }
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    res.json({ ok: true, resetToken: token });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ error: "Reset token and new password are required." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    const row = await prisma.passwordResetToken.findFirst({
      where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      res.status(400).json({ error: "That reset link is invalid or expired." });
      return;
    }
    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    await prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.delete("/account", requireAuth, async (req, res, next) => {
  try {
    const { password } = req.body as { password?: string };
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    if (user.passwordSet) {
      if (!password) {
        res.status(400).json({ error: "Enter your password to delete the account." });
        return;
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "Password is wrong." });
        return;
      }
    }
    await prisma.user.delete({ where: { id: user.id } });
    res.clearCookie("token", { ...cookieOptions(), maxAge: 0 });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
