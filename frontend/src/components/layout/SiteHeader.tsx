import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { BrandLogo } from "./BrandLogo";

const APP_LINKS = [
  { to: "/resumes", label: "My resumes" },
  { to: "/templates", label: "Templates" },
  { to: "/analyzer", label: "ATS analyser" },
  { to: "/ai", label: "AI assistant" },
  { to: "/cover-letters", label: "Cover letters" },
  { to: "/jobs", label: "Jobs" },
  { to: "/applications", label: "Applications" },
  { to: "/community", label: "Community" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/premium", label: "Premium" },
];

const LANDING_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#ats", label: "ATS" },
  { href: "#ai", label: "AI" },
  { href: "#jobs", label: "Jobs" },
];

export function SiteHeader({ variant }: { variant: "public" | "app" }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const cta = user ? "/templates" : "/register";

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to={variant === "app" ? "/resumes" : "/"} className="brand-lockup" aria-label="Redraft home">
          <BrandLogo />
        </Link>

        {variant === "app" ? (
          <nav className="site-nav desktop-only" aria-label="Primary">
            {APP_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        ) : (
          <nav className="site-nav desktop-only" aria-label="Landing">
            {LANDING_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <div className="site-header-actions">
          {variant === "public" ? (
            <>
              {user ? (
                <Link to="/resumes" className="text-sm font-medium">
                  My resumes
                </Link>
              ) : (
                <Link to="/login" className="text-sm font-medium">
                  Log in
                </Link>
              )}
              <Link to={cta} className="btn btn-copper">
                Build a resume
              </Link>
            </>
          ) : (
            <>
              <Link to="/settings" className="hidden text-xs text-[var(--muted)] sm:inline">
                {user?.isPremium ? "Premium" : "Free"} · Settings
              </Link>
              <Link to="/templates" className="btn btn-copper">
                Build a resume
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-ghost hidden sm:inline-flex"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                Log out
              </button>
              <button type="button" className="nav-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? "Close" : "Menu"}
              </button>
            </>
          )}
        </div>
      </div>

      {variant === "app" && open ? (
        <nav className="site-mobile-nav open" aria-label="Mobile">
          {APP_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={() => setOpen(false)}>
            Settings
          </NavLink>
          <button
            type="button"
            className="btn btn-sm btn-ghost mt-2 w-full sm:hidden"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            Log out
          </button>
        </nav>
      ) : null}
    </header>
  );
}
