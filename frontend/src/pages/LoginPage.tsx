import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthDivider, GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { AuthFrame } from "../components/layout/AuthFrame";
import { useAuthStore, type AuthUser } from "../store/authStore";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextEmail = !email.trim() ? "Enter your email." : !isEmail(email) ? "Enter a valid email address." : "";
    const nextPassword = !password ? "Enter your password." : "";
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setError("");
    if (nextEmail || nextPassword) return;

    setBusy(true);
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      navigate("/resumes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Welcome back" subtitle="Pick up a draft or start a new layout.">
      <GoogleSignInButton next="/resumes" />
      <AuthDivider />
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="form-error">{error}</p> : null}
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Email
          <input
            className={`field mt-1 ${emailError ? "field-error" : ""}`}
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
          />
          {emailError ? <span className="field-hint">{emailError}</span> : null}
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Password
          <input
            className={`field mt-1 ${passwordError ? "field-error" : ""}`}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
          />
          {passwordError ? <span className="field-hint">{passwordError}</span> : null}
        </label>
        <button className="btn btn-copper w-full" disabled={busy} type="submit">
          {busy ? (
            <>
              <span className="spinner" aria-hidden /> Signing in…
            </>
          ) : (
            "Log in"
          )}
        </button>
      </form>
      <p className="mt-3 text-sm">
        <Link to="/forgot-password" className="auth-link">
          Forgot password?
        </Link>
      </p>
      <p className="mt-4 text-sm text-[var(--muted)]">
        New here?{" "}
        <Link to="/register" className="auth-link">
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}
