import { useEffect, type ReactNode } from "react";
import { b } from "../components/shared";
import { allowedPages } from "../state/permissions";
import { render, S } from "../state/store";
import type { Page } from "../types/domain";
const icons: Record<Page, string> = {
  Dashboard: "▦",
  "Patient Management": "♧",
  "New Risk Assessment": "♡",
  "Assessment History": "◷",
  Reports: "▤",
  "User Accounts": "♙",
  "Audit Logs": "☷",
  Maintenance: "⚙",
  Help: "?",
  About: "ⓘ",
  "My Account": "♙",
};
export function Workspace({ children }: { children: ReactNode }) {
  const user = S.user!;
  const notice = S.assessmentSavedNotice;
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      S.assessmentSavedNotice = 0;
      render();
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span>♥</span>PINTIG
        </div>
        <div className="brand-subtitle">
          Major Cardiovascular Risk
          <br />
          Assessment System
        </div>
        <small>WORKSPACE</small>
        {allowedPages(user.role).map((page) => (
          <button
            key={page}
            type="button"
            className={"nav-button " + (page === S.page ? "active" : "")}
            aria-current={page === S.page ? "page" : undefined}
            data-act={"nav:" + page}
          >
            {icons[page]} &nbsp; {page}
          </button>
        ))}
        <div className="userinfo">
          <div className="identity-caption">SIGNED IN AS</div>
          <div className="identity-name">{user.name}</div>
          <div className="identity-role">
            {user.role === "admin"
              ? "System Administrator"
              : "Healthcare Worker"}
          </div>
          {b("Sign out", "logout")}
        </div>
      </aside>
      <div className="appmain">
        <div className="assessment-save-toast" role="status" aria-live="polite" aria-atomic="true">
          {!!notice && (
            <>
              <span>Assessment saved. View it in Assessment History.</span>
              <button type="button" aria-label="Dismiss save notification" onClick={() => { S.assessmentSavedNotice = 0; render(); }}>×</button>
            </>
          )}
        </div>
        <header className="topbar">
          <div className="muted tiny">PINTIG / {S.page}</div>
          <div className="actions top-actions" style={{ margin: 0 }}>
            <span className="tiny">{user.name}</span>
            {b("Switch account", "switchRole")}
          </div>
        </header>
        <main className="maincontent">
          {S.message && (
            <div
              className={"feedback " + (S.error ? "error" : "")}
              role="status"
            >
              {S.message}
            </div>
          )}
          {children}
          <div
            id="pintigLiveAnnouncement"
            className="pintig-sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {S.announcement}
          </div>
        </main>
        <footer className="footer">
          PINTIG • Cardiovascular Risk Assessment &amp; Decision Support
        </footer>
      </div>
    </div>
  );
}
