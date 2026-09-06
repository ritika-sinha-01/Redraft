import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthFrame } from "../components/layout/AuthFrame";
import { useAuthStore, type AuthUser } from "../store/authStore";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function RegisterPage() {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const nextName = !name.trim() ? "Enter your name." : "";
    const nextEmail = !email.trim() ? "Enter your email." : !isEmail(email) ? "Enter a valid email address." : "";
    const nextPassword = !password ? "Choose a password." : password.length < 6 ? "Use at least 6 characters." : "";
    setNameError(nextName);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setError("");
    if (nextName || nextEmail || nextPassword) return;

    setBusy(true);
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(data.user);
      navigate("/templates");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Create your account" subtitle="A resume in minutes — templates, ATS, and export included.">
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {error ? <p className="form-error">{error}</p> : null}
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Full name
          <input
            className={`field mt-1 ${nameError ? "field-error" : ""}`}
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
          />
          {nameError ? <span className="field-hint">{nameError}</span> : null}
        </label>
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
            autoComplete="new-password"
            placeholder="6+ characters"
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
              <span className="spinner" aria-hidden /> Creating…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link to="/login" className="auth-link">
          Log in
        </Link>
      </p>
    </AuthFrame>
  );
}
