// Public home page: hero section, feature list and calls to action. Buttons adapt to whether the user is logged in.
import { Link } from "react-router-dom";
import { pick } from "../palette";
import { FileSearch, FilePlus2, Target, Sparkles, ShieldCheck, Gauge } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ScoreStamp from "../components/ScoreStamp";

// Content for the feature cards in the "What ResumePro checks" section (icon, title, text).
const FEATURES = [
  {
    icon: Gauge,
    title: "ATS scoring",
    body: "A rule-based engine grades formatting, impact, and clarity the way applicant tracking systems parse resumes.",
  },
  {
    icon: Target,
    title: "Job match analysis",
    body: "Paste a job description and see exactly which keywords you're matching, and which ones you're missing.",
  },
  {
    icon: Sparkles,
    title: "AI-written bullets",
    body: "Describe what you did in plain language — the builder turns it into polished, quantified resume bullets.",
  },
  {
    icon: ShieldCheck,
    title: "Strengths & gaps",
    body: "An LLM reviews your resume like a hiring manager, flagging real strengths, weaknesses, and skill gaps.",
  },
];

// The landing page component.
export default function Landing() {
  // Current user (or null); decides where the buttons link to.
  const { user } = useAuth();

  return (
    <div>
      {/* Hero section: headline, short pitch and two buttons on the left, a fake sample analysis card on the right. */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="stagger">
            <div className="inline-flex items-center gap-2 rounded-full border border-(--color-line) bg-(--color-surface-2) px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-(--color-muted)">
              <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_8px_rgba(216,34,108,0.8)]" />
              AI Resume Intelligence
            </div>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] md:text-5xl text-(--color-ink)">
              Get your resume <span className="text-rainbow">graded</span>, <span className="text-(--color-ink) font-extrabold underline decoration-(--color-accent) decoration-2 underline-offset-6">marked up</span>, and rewritten.
            </h1>
            <p className="mt-5 max-w-lg text-(--color-muted)">
              Upload a resume or build one from scratch. ResumePro scores it like an ATS,
              reviews it like a hiring manager, and helps you fix what's holding it back.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {/* Logged-in users go straight to the tool; visitors are sent to register first. */}
              <Link
                to={user ? "/analyze" : "/register"}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(216,34,108,0.45)] hover:shadow-[0_0_35px_rgba(216,34,108,0.7)] hover:scale-[1.02] transition-all"
              >
                <FileSearch size={16} /> Analyze my resume
              </Link>
              <Link
                to={user ? "/builder" : "/register"}
                className="inline-flex items-center gap-2 rounded-full border border-(--color-line) bg-(--color-surface) px-6 py-3.5 text-sm font-semibold text-(--color-ink) hover:border-(--color-accent) hover:text-(--color-accent) hover:scale-[1.02] transition-all"
              >
                <FilePlus2 size={16} /> Build a resume
              </Link>
            </div>
          </div>

          {/* Decorative sample analysis card (static demo values, not real data). */}
          <div className="flex justify-center md:justify-end">
            <div className="paper-card float-slow relative w-full max-w-sm rounded-2xl p-8 border border-(--color-line) shadow-[0_0_40px_-10px_rgba(0,91,179,0.2)]">
              <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-muted)">
                Sample analysis
              </p>
              <div className="mt-6 flex items-center justify-between">
                <ScoreStamp score={82} size={96} />
                <div className="flex-1 space-y-3.5 pl-6">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                      <span>Keyword match</span><span className="font-mono text-(--color-accent) font-semibold">88%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-(--color-surface-2)">
                      <div className="h-full w-[88%] rounded-full bg-brand shadow-[0_0_10px_rgba(0,91,179,0.7)]" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-(--color-muted)">
                      <span>ATS Flags</span><span className="font-mono text-(--color-warn) font-semibold">3 warnings</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-(--color-surface-2)">
                      <div className="h-full w-[45%] rounded-full bg-(--color-warn)" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="mark-add mt-6 text-sm text-(--color-accent)">Quantify the team size you led</p>
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-(--color-line) bg-(--color-surface-2) p-3 text-xs text-(--color-ink)">
                <span className="font-bold text-(--color-accent)">!</span>
                <span>Passive phrasing detected — replace with impact verbs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature section: one card per entry in FEATURES. */}
      <section className="border-t border-(--color-line) bg-(--color-surface-2)/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-semibold">What ResumePro checks</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Loop over FEATURES; `--i` is a CSS variable used to stagger the entrance animation. */}
            {FEATURES.map(({ icon: Icon, title, body }, idx) => (
              <div
                key={title}
                className="paper-card card-lift rise rounded-2xl p-6 border transition-all hover:border-(--color-accent) hover:shadow-[0_0_20px_rgba(0,91,179,0.25)]"
                style={{ "--i": idx }}
              >
                <Icon size={22} style={{ color: pick(idx) }} />
                <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-(--color-muted)">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action. */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-semibold md:text-3xl">
          Stop guessing why your resume isn't landing interviews.
        </h2>
        <Link
          to={user ? "/analyze" : "/register"}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-(--color-accent-ink) shadow-[0_0_24px_rgba(216,34,108,0.4)] hover:shadow-[0_0_32px_rgba(216,34,108,0.6)] hover:scale-[1.02] transition-all"
        >
          <FileSearch size={16} /> {user ? "Go to analyzer" : "Create a free account"}
        </Link>
      </section>

      {/* Footer. */}
      <footer className="border-t border-(--color-line) py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2 font-display text-base font-black text-(--color-logo)">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-(--color-logo) bg-(--color-logo-muted) text-(--color-logo)">
              <FileSearch size={12} />
            </span>
            ResumePro
            <span className="rounded-full border border-(--color-logo-border) bg-(--color-logo-muted) px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-widest text-(--color-logo)">
              AI
            </span>
          </div>
          <p className="text-xs text-(--color-muted)">
            AI-powered resume analyzer, builder & career intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
}
