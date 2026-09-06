import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useAuthStore, type AuthUser } from "../store/authStore";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
      setUser(data.user);
      setMsg("Name saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save name");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setMsg("Password updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    if (!window.confirm("Delete this account and every resume, letter, and application? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/account", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) });
      await logout();
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the account");
      setBusy(false);
    }
  }

  return (
    <div className="page bg-[var(--cream)]">
      <p className="chip">Account</p>
      <h1 className="serif mt-3 text-4xl text-[var(--navy)]">Settings</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">{user?.email}</p>
      {error ? <p className="form-error mt-4 max-w-xl">{error}</p> : null}
      {msg ? <p className="mt-3 text-sm text-emerald-800">{msg}</p> : null}

      <div className="mt-8 grid max-w-2xl gap-6">
        <form className="card space-y-4 p-6" onSubmit={saveName}>
          <h2 className="serif text-2xl">Name</h2>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Display name
            <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn-copper" disabled={busy} type="submit">
            Save name
          </button>
        </form>

        <form className="card space-y-4 p-6" onSubmit={changePassword}>
          <h2 className="serif text-2xl">Change password</h2>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Current password
            <input
              className="field mt-1"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            New password
            <input
              className="field mt-1"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <button className="btn btn-copper" disabled={busy || !currentPassword || newPassword.length < 6} type="submit">
            Update password
          </button>
        </form>

        <form className="card space-y-4 p-6" onSubmit={deleteAccount}>
          <h2 className="serif text-2xl">Delete account</h2>
          <p className="text-sm text-[var(--muted)]">Removes your account, resumes, letters, and applications.</p>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Confirm with password
            <input
              className="field mt-1"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </label>
          <button className="btn btn-ghost" disabled={busy || !deletePassword} type="submit">
            Delete my account
          </button>
        </form>
      </div>
    </div>
  );
}
