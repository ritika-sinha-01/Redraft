import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  const location = useLocation();
  const editor = location.pathname.startsWith("/editor");

  return (
    <div className="app-frame">
      <SiteHeader variant="app" />
      <div className="workspace" style={{ background: editor ? "var(--cream)" : undefined }}>
        <Outlet />
      </div>
    </div>
  );
}
