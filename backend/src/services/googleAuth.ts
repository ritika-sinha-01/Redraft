import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";

let client: OAuth2Client | null = null;

function googleClient() {
  if (!env.googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }
  if (!client) client = new OAuth2Client(env.googleClientId);
  return client;
}

export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await googleClient().verifyIdToken({
    idToken,
    audience: env.googleClientId,
  });
  const payload = ticket.getPayload();
  const email = payload?.email?.toLowerCase().trim();
  const googleId = payload?.sub;
  if (!payload?.email_verified || !email || !googleId) {
    throw new Error("Google did not return a verified email.");
  }
  return {
    email,
    googleId,
    name: (payload.name || email.split("@")[0]).trim(),
  };
}
