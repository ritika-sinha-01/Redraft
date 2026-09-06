import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";

export function AuthFrame({
  title,
  subtitle,
  children,
  hideTabs = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  hideTabs?: boolean;
}) {
  const { pathname } = useLocation();
  const login = pathname === "/login";

  return (
    <div className="min-h-screen bg-[var(--navy)]">
      <SiteHeader variant="public" />
      <div className="auth-screen hero-grid">
        <div className="card auth-card">
          <Link to="/" className="text-sm text-[var(--muted)]">
            ← Home
          </Link>
          <h1 className="serif mt-4 text-3xl text-[var(--navy)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          {hideTabs ? null : (
            <div className="auth-tabs" role="tablist">
              <Link to="/login" role="tab" aria-selected={login} className={`auth-tab ${login ? "active" : ""}`}>
                Log in
              </Link>
              <Link to="/register" role="tab" aria-selected={!login} className={`auth-tab ${!login ? "active" : ""}`}>
                Register
              </Link>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
