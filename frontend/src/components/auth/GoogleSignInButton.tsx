import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { useAuthStore, type AuthUser } from "../../store/authStore";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

let scriptLoading: Promise<void> | null = null;

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

export function GoogleSignInButton({ next = "/resumes" }: { next?: string }) {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<{ clientId?: string; enabled?: boolean }>("/api/auth/google")
      .then((d) => {
        if (!cancelled && d.clientId) setClientId(d.clientId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    loadGis()
      .then(() => setReady(true))
      .catch((err) => setError(err instanceof Error ? err.message : "Google sign-in failed to load"));
  }, [clientId]);

  if (!clientId) return null;

  async function signIn() {
    setError("");
    setBusy(true);
    try {
      await loadGis();
      if (!window.google?.accounts?.id) {
        throw new Error("Google sign-in is not available.");
      }
      await new Promise<void>((resolve, reject) => {
        window.google!.accounts.id.initialize({
          client_id: clientId,
          callback: async (res) => {
            try {
              if (!res.credential) {
                reject(new Error("Google did not return a sign-in token."));
                return;
              }
              const data = await api<{ user: AuthUser }>("/api/auth/google", {
                method: "POST",
                body: JSON.stringify({ idToken: res.credential }),
              });
              setUser(data.user);
              navigate(next);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
        });
        window.google!.accounts.id.prompt();
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Could not sign in with Google");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="form-error">{error}</p> : null}
      <button type="button" className="btn btn-outline w-full" disabled={busy || !ready} onClick={() => void signIn()}>
        {busy ? "Connecting to Google…" : "Continue with Google"}
      </button>
    </div>
  );
}

export function AuthDivider() {
  return (
    <p className="my-4 text-center text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">or</p>
  );
}
