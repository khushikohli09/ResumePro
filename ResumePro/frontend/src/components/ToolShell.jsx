// Common page layout for each AI tool (back link, heading, description) plus small shared helpers used by the tools.
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Wraps a tool page; `wide` switches to a wider container for tools with more content.
export default function ToolShell({ eyebrow, title, description, wide = false, children }) {
  return (
    <div className={`mx-auto px-6 py-12 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
      {/* Link back to the tools list. */}
      <Link to="/tools" className="inline-flex items-center gap-1 text-xs text-(--color-muted) hover:text-(--color-accent)"><ArrowLeft size={13} /> All tools</Link>
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-(--color-accent)">{eyebrow}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-(--color-muted)">{description}</p>
      <div className="mt-8 space-y-6">{children}</div>
    </div>
  );
}

// Primary action button used by tools; shows the working text while a request is running.
export function RunButton({ onClick, disabled, busy, idle, working = "Working…", icon: Icon }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-(--color-accent-ink) shadow-[0_0_18px_rgba(0,91,179,0.35)] hover:shadow-[0_0_24px_rgba(0,91,179,0.55)] hover:scale-[1.01] transition-all disabled:opacity-40"
    >
      {/* `icon: Icon` renames the prop so it can be used as a component; shows busy text or idle text. */}
      {Icon && <Icon size={16} />} {busy ? working : idle}
    </button>
  );
}

// Small note telling the user whether the AI review ran or only the built-in rules were used.
export const AiNote = ({ aiUsed }) => (
  <p className="font-mono text-[11px] text-(--color-muted)">
    {aiUsed ? "Rule-based checks + AI review" : "Rule-based checks only. AI review was unavailable (check the LLM key in backend/.env)."}
  </p>
);

// Maps an issue severity ("high", "medium", anything else) to a color.
export const sevColor = (s) => (s === "high" ? "var(--color-danger)" : s === "medium" ? "var(--color-warn)" : "var(--color-muted)");
