// Dashboard: the user's home after login, with stats, a suggested next step, score chart, quick tools and the list of saved resumes.
import { useEffect, useMemo, useState } from "react";
import { pick } from "../palette";
import { Link } from "react-router-dom";
import { FileSearch, FilePlus2, Trash2, Pencil, Check, X, Files, Gauge, Trophy, Hammer, Search, ArrowRight, Sparkles, SpellCheck, ShieldCheck, Briefcase, Route as RouteIcon, Globe, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { listResumes, deleteResume, renameResume } from "../api/resume";
import { useAuth } from "../context/AuthContext";
import { useCountUp, useTypewriter } from "../hooks/useMotion";
import ScoreRing, { scoreColor } from "../components/ScoreRing";

// Shortcut buttons to the AI tools shown in the Quick tools card.
const QUICK_TOOLS = [
  { to: "/tools/grammar", icon: SpellCheck, label: "Grammar" },
  { to: "/tools/authenticity", icon: ShieldCheck, label: "Authenticity" },
  { to: "/tools/linkedin", icon: UserRound, label: "LinkedIn" },
  { to: "/tools/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/tools/roadmap", icon: RouteIcon, label: "Roadmap" },
  { to: "/tools/portfolio", icon: Globe, label: "Portfolio" },
];

// Returns a greeting based on the current hour of the day.
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

// Rule-based (no LLM call): picks the most useful next action from the user's own data.
function nextStep(resumes) {
  // No resumes yet: suggest uploading one.
  if (!resumes.length) return { text: "Upload your first resume to get an ATS score and detailed feedback.", to: "/analyze", cta: "Analyze a resume" };
  // Only resumes that already have an overall score.
  const scored = resumes.filter((r) => r.analysis?.overallScore != null);
  // Resumes exist but none is scored: suggest the grammar check on the first one.
  if (!scored.length) return { text: `"${resumes[0].title}" has no score yet. Start by checking its writing quality.`, to: `/tools/grammar?resume=${resumes[0]._id}`, cta: "Run grammar check" };
  // Sort a copy of the scored resumes from lowest to highest score.
  const byScore = [...scored].sort((a, b) => a.analysis.overallScore - b.analysis.overallScore);
  // The lowest-scoring resume.
  const worst = byScore[0];
  // If the weakest score is under 70, suggest improving that resume.
  if (worst.analysis.overallScore < 70)
    return { text: `"${worst.title}" scores ${Math.round(worst.analysis.overallScore)}. Replacing weak verbs and vague lines is the fastest way to raise it.`, to: `/tools/grammar?resume=${worst._id}`, cta: "Open grammar checker" };
  // Otherwise take the highest-scoring resume and suggest planning a roadmap with it.
  const best = byScore[byScore.length - 1];
  return { text: `Your scores look solid. Compare "${best.title}" against a target role and plan any skill gaps.`, to: `/tools/roadmap?resume=${best._id}`, cta: "Build a roadmap" };
}

// One statistic tile with an icon, label and a number that counts up.
function Stat({ icon: Icon, label, value, suffix = "", index }) {
  // Animated number that counts up to `value`; `index` staggers the start between tiles.
  const n = useCountUp(value, { delay: index * 90 });
  return (
    <div className="paper-card rise rounded-2xl p-5" style={{ "--i": index }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-(--color-muted)">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--color-surface-2)" style={{ color: pick(index) }}><Icon size={15} /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{n}<span className="text-lg text-(--color-muted)">{suffix}</span></p>
    </div>
  );
}

// Card showing the suggested next step with a typewriter text effect and a button.
function NextStepBanner({ step }) {
  // `shown` is the text typed so far; `done` is true when typing has finished (the caret then disappears).
  const { shown, done } = useTypewriter(step.text);
  return (
    <div className="banner-sheen paper-card rise relative overflow-hidden rounded-2xl p-6" style={{ "--i": 4 }}>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-60 flex-1">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-(--color-accent)">
            <Sparkles size={13} /> Suggested next step <span className="pulse-dot" aria-hidden />
          </p>
          <p className="mt-2 min-h-12 max-w-2xl font-display text-lg leading-snug" aria-label={step.text}>
            <span aria-hidden>{shown}</span>
            <span aria-hidden className={done ? "" : "caret"} />
          </p>
        </div>
        <Link to={step.to} className="group inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-(--color-accent-ink) hover:opacity-90">
          {step.cta} <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// Grey placeholder layout shown while resumes are loading.
function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12" aria-busy="true" aria-label="Loading your dashboard">
      <div className="skeleton h-9 w-72" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      <div className="skeleton mt-6 h-28" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40" />)}</div>
    </div>
  );
}

// The dashboard page component.
export default function Dashboard() {
  // Current user, used for the greeting.
  const { user } = useAuth();
  // List of resumes; `null` means still loading.
  const [resumes, setResumes] = useState(null);
  // Id of the resume whose title is being renamed (null if none).
  const [editingId, setEditingId] = useState(null);
  // Text currently typed in the rename box.
  const [editValue, setEditValue] = useState("");
  // Id of the resume being deleted, used to play the exit animation.
  const [leaving, setLeaving] = useState(null);
  // Text typed in the search box.
  const [query, setQuery] = useState("");
  // Selected filter: all, uploaded or built.
  const [filter, setFilter] = useState("all");

  // API call: loads resumes; on failure shows an empty list.
  const load = () => listResumes().then(setResumes).catch(() => setResumes([]));
  // Load resumes once when the page first appears.
  useEffect(() => { load(); }, []);

  // Computes the stats; useMemo recalculates only when `resumes` changes.
  const stats = useMemo(() => {
    // Use an empty list while loading.
    const list = resumes || [];
    // Collect the overall scores, skipping resumes without one.
    const scores = list.map((r) => r.analysis?.overallScore).filter((s) => s != null);
    return {
      total: list.length,
      // Average score, rounded (0 if there are no scores).
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      // Highest score.
      best: scores.length ? Math.round(Math.max(...scores)) : 0,
      // Number of resumes made in the builder.
      built: list.filter((r) => r.source === "builder").length,
    };
  }, [resumes]);

  // Resumes matching the chosen filter and the search text (case-insensitive).
  const visible = useMemo(
    () => (resumes || []).filter((r) => (filter === "all" || r.source === (filter === "built" ? "builder" : "uploaded")) && r.title.toLowerCase().includes(query.toLowerCase())),
    [resumes, query, filter]
  );
  // First six scored resumes, used for the bar chart.
  const chartRows = useMemo(() => (resumes || []).filter((r) => r.analysis?.overallScore != null).slice(0, 6), [resumes]);

  // Deletes a resume after the user confirms.
  const onDelete = async (id) => {
    if (!confirm("Delete this resume? This can't be undone.")) return;
    // Mark the card as leaving so its exit animation runs.
    setLeaving(id);
    try {
      await new Promise((res) => setTimeout(res, 260)); // let the exit animation play
      // API call: delete on the server, then reload the list.
      await deleteResume(id);
      toast.success("Resume deleted");
      await load();
    } catch {
      toast.error("Could not delete resume");
    } finally {
      setLeaving(null);
    }
  };

  // Saves the new title via the API, closes the edit box and reloads the list.
  const saveRename = async (id) => {
    try { await renameResume(id, editValue); setEditingId(null); load(); } catch { toast.error("Could not rename resume"); }
  };

  // Show the skeleton until resumes have loaded.
  if (resumes === null) return <DashboardSkeleton />;

  // Work out the suggested next step from the loaded resumes.
  const step = nextStep(resumes);
  // First word of the user's name for the greeting.
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Header: today's date, greeting and main action buttons. */}
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-(--color-muted)">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/analyze" className="inline-flex items-center gap-2 rounded-full border border-(--color-line) bg-(--color-surface) px-4 py-2 text-sm font-medium hover:border-(--color-accent) hover:text-(--color-accent)"><FileSearch size={15} /> Analyze</Link>
          <Link to="/builder" className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-(--color-accent-ink) hover:opacity-90"><FilePlus2 size={15} /> New resume</Link>
        </div>
      </div>

      {/* Row of four statistic tiles. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat index={0} icon={Files} label="Resumes" value={stats.total} />
        <Stat index={1} icon={Gauge} label="Average score" value={stats.avg} suffix="/100" />
        <Stat index={2} icon={Trophy} label="Best score" value={stats.best} suffix="/100" />
        <Stat index={3} icon={Hammer} label="Built in builder" value={stats.built} />
      </div>

      {/* Suggested next step; `key` restarts the typewriter when the text changes. */}
      <div className="mt-6"><NextStepBanner key={step.text} step={step} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Left card: bar chart comparing resume scores. */}
        <div className="paper-card rise rounded-2xl p-6 lg:col-span-3" style={{ "--i": 5 }}>
          <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-accent)">Score overview</p>
          <h2 className="mt-1 font-display text-lg font-semibold">How your resumes compare</h2>
          {/* Show a hint if nothing is scored yet, otherwise one bar per resume. */}
          {chartRows.length === 0 ? (
            <p className="mt-6 text-sm text-(--color-muted)">Analyze a resume and its score will show up here.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {chartRows.map((r, i) => {
                // Round the score and use it for the label and bar width.
                const s = Math.round(r.analysis.overallScore);
                return (
                  <Link key={r._id} to={`/resume/${r._id}`} className="group block">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="max-w-[70%] truncate font-medium group-hover:text-(--color-accent)">{r.title}</span>
                      <span className="font-mono" style={{ color: scoreColor(s) }}>{s}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-(--color-surface-2)">
                      <div className="grow-x h-full rounded-full" style={{ width: `${Math.max(3, s)}%`, background: scoreColor(s), "--i": i }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right card: quick links to the AI tools. */}
        <div className="paper-card rise rounded-2xl p-6 lg:col-span-2" style={{ "--i": 6 }}>
          <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-accent)">AI toolkit</p>
          <h2 className="mt-1 font-display text-lg font-semibold">Quick tools</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {QUICK_TOOLS.map(({ to, icon: Icon, label }, i) => (
              <Link
                key={to}
                to={to}
                className="rise card-lift group flex items-center gap-2.5 rounded-xl border border-(--color-line) bg-(--color-surface-2) px-3 py-3 text-sm font-medium hover:border-(--color-accent)"
                style={{ "--i": i + 7 }}
              >
                <Icon size={16} style={{ color: pick(i) }} className="transition-transform group-hover:scale-125 group-hover:-rotate-6" /> {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Header for the resume list with search box and filter buttons. */}
      <div className="rise mt-10 flex flex-wrap items-center justify-between gap-4" style={{ "--i": 8 }}>
        <h2 className="font-display text-2xl font-semibold">Your resumes</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-muted)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search resumes" className="w-44 rounded-full border border-(--color-line) bg-(--color-surface) py-1.5 pl-8 pr-3 text-sm outline-none transition-all focus:w-56 focus:border-(--color-accent)" />
          </div>
          <div className="inline-flex rounded-full border border-(--color-line) bg-(--color-surface) p-1">
            {[["all", "All"], ["uploaded", "Uploaded"], ["built", "Built"]].map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === k ? "bg-brand text-(--color-accent-ink)" : "text-(--color-muted) hover:text-(--color-ink)"}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state, or the grid of resume cards. */}
      {visible.length === 0 ? (
        <div className="paper-card rise mt-6 rounded-2xl p-10 text-center" style={{ "--i": 9 }}>
          <div className="float-slow mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-(--color-accent) text-(--color-accent)"><Files size={22} /></div>
          <p className="mt-4 text-(--color-muted)">{resumes.length === 0 ? "No resumes yet. Upload one for analysis or build one from scratch." : "No resumes match your search."}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Loop over the visible resumes to render one card each. */}
          {visible.map((r, i) => {
            // Only show a score ring if this resume has been scored.
            const hasScore = r.analysis?.overallScore != null;
            return (
              <div key={r._id} className={`paper-card rise card-lift flex flex-col justify-between rounded-2xl p-5 ${leaving === r._id ? "leaving" : ""}`} style={{ "--i": i + 9 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Rename mode shows an input with save/cancel buttons; otherwise the title is a link to the detail page. */}
                    {editingId === r._id ? (
                      <div className="flex items-center gap-1">
                        <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveRename(r._id)} className="w-full rounded-lg border border-(--color-line) bg-(--color-surface) px-2 py-1 text-sm outline-none focus:border-(--color-accent)" />
                        <button onClick={() => saveRename(r._id)} aria-label="Save name" className="p-1 text-(--color-good)"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} aria-label="Cancel" className="p-1 text-(--color-muted) hover:text-(--color-ink)"><X size={16} /></button>
                      </div>
                    ) : (
                      <Link to={`/resume/${r._id}`} className="block truncate font-display text-base font-semibold hover:text-(--color-accent)">{r.title}</Link>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-(--color-muted)">
                      {r.source === "builder" ? <Hammer size={11} /> : <FileSearch size={11} />}{r.source === "builder" ? "Built" : "Uploaded"}
                    </p>
                  </div>
                  {/* Score ring for scored resumes. */}
                  {hasScore && <ScoreRing score={r.analysis.overallScore} index={i} />}
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs text-(--color-muted)">Updated {new Date(r.updatedAt).toLocaleDateString()}</span>
                  <div className="flex gap-1">
                    {/* Edit link (built resumes only), rename button and delete button. */}
                    {r.source === "builder" && <Link to={`/builder/${r._id}`} aria-label="Edit in builder" className="rounded-full p-1.5 text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-accent)"><FilePlus2 size={14} /></Link>}
                    <button onClick={() => { setEditingId(r._id); setEditValue(r.title); }} aria-label="Rename" className="rounded-full p-1.5 text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-accent)"><Pencil size={14} /></button>
                    <button onClick={() => onDelete(r._id)} aria-label="Delete" className="rounded-full p-1.5 text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
