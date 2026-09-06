import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { AuthFrame } from "../components/layout/AuthFrame";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Set a new password" subtitle="Choose at least 6 characters, then log in." hideTabs>
      <form noValidate className="space-y-4" onSubmit={onSubmit}>
        {error ? <p className="form-error">{error}</p> : null}
        {!token ? <p className="form-error">This reset link is missing a token. Start from Forgot password.</p> : null}
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          New password
          <input
            className="field mt-1"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn-copper w-full" disabled={busy || !token || password.length < 6} type="submit">
          {busy ? "Saving…" : "Save password"}
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
