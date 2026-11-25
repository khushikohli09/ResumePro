// Top navigation bar: logo, main links (when logged in), and login/logout buttons.
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FileSearch, LogOut, LayoutDashboard, FilePlus2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Returns the CSS classes for a nav link; NavLink passes `isActive` so the current page is highlighted.
const navLinkClass = ({ isActive }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-(--color-surface-2) text-(--color-accent)" : "text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)"
  }`;

// The navbar shown on every page.
export default function Navbar() {
  // `user` is the logged-in user (or null) and `logout` clears the session; both come from the auth context.
  const { user, logout } = useAuth();
  // `navigate` lets us change page from code (used after logging out).
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-(--color-line) bg-(--color-bg)/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="brand-mark flex items-center gap-2.5">
          <span className="brand-ring flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-(--color-logo) bg-(--color-logo-muted) text-(--color-logo) shadow-[0_0_14px_var(--color-logo-shadow)]">
            <FileSearch size={15} />
          </span>
          <span className="flex items-center gap-1.5 font-display text-lg font-black tracking-tight text-(--color-logo)">
            ResumePro
            <span className="rounded-full border border-(--color-logo-border) bg-(--color-logo-muted) px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest text-(--color-logo)">
              AI
            </span>
          </span>
        </Link>

        {/* Desktop links are only shown to logged-in users (and hidden on small screens). */}
        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
            <NavLink to="/analyze" className={navLinkClass}>Analyzer</NavLink>
            <NavLink to="/builder" className={navLinkClass}>Builder</NavLink>
            <NavLink to="/tools" className={navLinkClass}>Tools</NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {/* Logged in: show the user's name and a logout button. Otherwise show Log in / Get started links. */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-xs text-(--color-muted) sm:inline">
                {user.name}
              </span>
              <button
                onClick={() => {
                  // On click: log the user out, then go back to the home page.
                  logout();
                  navigate("/");
                }}
                aria-label="Log out"
                title="Log out"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--color-line) text-(--color-ink) hover:border-(--color-accent) hover:text-(--color-accent) transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-(--color-ink) hover:text-(--color-accent) transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-(--color-accent-ink) shadow-[0_0_18px_rgba(216,34,108,0.35)] hover:shadow-[0_0_24px_rgba(0,91,179,0.55)] hover:scale-[1.02] transition-all"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile version of the links (shown below the main bar on small screens), again only for logged-in users. */}
      {user && (
        <nav className="flex items-center gap-5 border-t border-(--color-line) px-6 py-2 md:hidden">
          <NavLink to="/dashboard" className={navLinkClass}>
            <LayoutDashboard size={14} className="inline mr-1" /> Dashboard
          </NavLink>
          <NavLink to="/analyze" className={navLinkClass}>
            <FileSearch size={14} className="inline mr-1" /> Analyzer
          </NavLink>
          <NavLink to="/builder" className={navLinkClass}>
            <FilePlus2 size={14} className="inline mr-1" /> Builder
          </NavLink>
          <NavLink to="/tools" className={navLinkClass}>
            <Sparkles size={14} className="inline mr-1" /> Tools
          </NavLink>
        </nav>
      )}
    </header>
  );
}
