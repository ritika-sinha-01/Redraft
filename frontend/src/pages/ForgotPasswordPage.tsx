import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthFrame } from "../components/layout/AuthFrame";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ ok: boolean; resetToken?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (data.resetToken) {
        navigate(`/reset-password?token=${encodeURIComponent(data.resetToken)}`);
        return;
      }
      setError("Could not start a reset for that email.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start a reset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Forgot password" subtitle="Enter the email on the account. We will open a reset page — this local app does not send mail." hideTabs>
      <form noValidate className="space-y-4" onSubmit={onSubmit}>
        {error ? <p className="form-error">{error}</p> : null}
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Email
          <input
            className="field mt-1"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button className="btn btn-copper w-full" disabled={busy || !email.trim()} type="submit">
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        <Link to="/login" className="auth-link">
          Back to log in
        </Link>
      </p>
    </AuthFrame>
  );
}
