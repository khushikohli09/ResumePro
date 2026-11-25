// Roadmap tool: compares a resume with a target role or job posting and builds a phased learning plan.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Route as RouteIcon } from "lucide-react";
import toast from "react-hot-toast";
import ToolShell, { RunButton, AiNote } from "../../components/ToolShell";
import ResumePicker, { usePicker, pickerPayload, pickerReady } from "../../components/ResumePicker";
import ScoreStamp from "../../components/ScoreStamp";
import Card from "../../components/Card";
import KeywordChips from "../../components/KeywordChips";
import MarkedList from "../../components/MarkedList";
import { getRoadmap, listRoles } from "../../api/tools";

// Colors for skill priority labels.
const PRIORITY = { high: "var(--color-accent)", medium: "var(--color-warn)", low: "var(--color-muted)" };

// The roadmap page component.
export default function Roadmap() {
  // URL query parameters, e.g. `?role=...` coming from the Jobs tool.
  const [sp] = useSearchParams();
  // Resume source (saved resume or pasted text).
  const [input, setInput] = usePicker();
  // Target role, prefilled from the URL when present.
  const [role, setRole] = useState(sp.get("role") || "");
  // Optional job description; if given it overrides the role's standard skills.
  const [jd, setJd] = useState("");
  // Hours per week the user can study (used to estimate duration).
  const [hours, setHours] = useState(10);
  // List of known roles for the autocomplete suggestions.
  const [roles, setRoles] = useState([]);
  // True while the request is running.
  const [busy, setBusy] = useState(false);
  // The generated roadmap; null until loaded.
  const [r, setR] = useState(null);

  // API call on first render: load the known roles; ignore errors (autocomplete is optional).
  useEffect(() => { listRoles().then(setRoles).catch(() => {}); }, []);

  // Runs when the user clicks the build button.
  const run = async () => {
    setBusy(true);
    try {
      // API call: send the resume plus target role, job description and weekly hours.
      setR(await getRoadmap(pickerPayload(input), { targetRole: role, jobDescription: jd, hoursPerWeek: hours }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not build the roadmap");
    } finally {
      setBusy(false);
    }
  };

  // Shared CSS classes for the form fields.
  const field = "w-full rounded-lg border border-(--color-line) bg-(--color-surface-2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

  return (
    <ToolShell eyebrow="Skill gap" title="Skill gap analysis & learning roadmap" description="Compare your resume with a target role or a real job posting, then get a phased plan to close the gaps." wide>
      {/* Input area: resume, target and run button. */}
      <div className="mx-auto max-w-4xl space-y-6">
        <ResumePicker value={input} onChange={setInput} />
        {/* Target role (with autocomplete list), hours per week and optional job description. */}
        <Card eyebrow="Target" title="What are you aiming for?">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-(--color-muted)">Target role</label>
              <input list="role-options" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Pick or type a role" className={field} />
              <datalist id="role-options">{roles.map((x) => <option key={x} value={x} />)}</datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-(--color-muted)">Hours per week</label>
              <input type="number" min={2} max={40} value={hours} onChange={(e) => setHours(e.target.value)} className={field} />
            </div>
          </div>
          <label className="mb-1 mt-4 block text-xs font-medium text-(--color-muted)">Job description (optional, overrides the role's standard skills)</label>
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={4} placeholder="Paste a job posting to compare against its exact requirements…" className={field} />
        </Card>
        {/* Needs valid resume input and either a role or a job description. */}
        <RunButton onClick={run} busy={busy} disabled={!pickerReady(input) || (!role.trim() && !jd.trim())} idle="Build my roadmap" working="Planning…" icon={RouteIcon} />
      </div>

      {/* Only show results once they exist. */}
      {r && (
        <>
          {/* Summary card: readiness score, target role and estimated duration. */}
          <Card className="flex flex-wrap items-center gap-8">
            <ScoreStamp score={r.readiness} label="Readiness" size={104} />
            <div className="min-w-60 flex-1">
              <p className="font-display text-lg font-semibold">{r.targetRole}</p>
              <p className="mt-1 text-sm text-(--color-muted)">{r.summary}</p>
              <p className="mt-2 font-mono text-xs text-(--color-muted)">~{r.totalWeeks} weeks at {hours} h/week</p>
              <div className="mt-2"><AiNote aiUsed={r.aiUsed} /></div>
            </div>
          </Card>

          {/* Skills you already have next to the skills you still need to learn. */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card eyebrow="Already covered" title={`${r.matchedSkills.length} skills you have`}>
              <KeywordChips keywords={r.matchedSkills} variant="matched" />
            </Card>
            <Card eyebrow="Skill gap" title={`${r.missingSkills.length} skills to learn`}>
              {/* Missing skills are colored by priority. */}
              {r.missingSkills.length === 0 ? <p className="text-sm text-(--color-good)">No gaps found for this role.</p> : (
                <div className="flex flex-wrap gap-2">
                  {r.missingSkills.map((m) => (
                    <span key={m.skill} className="rounded-full border px-3 py-1 font-mono text-xs" style={{ color: PRIORITY[m.priority], borderColor: PRIORITY[m.priority] }} title={`${m.priority} priority`}>{m.skill}</span>
                  ))}
                </div>
              )}
              <p className="mt-3 font-mono text-[11px] text-(--color-muted)"><span className="text-(--color-accent) font-semibold">Blue</span> = learn first · orange = next · grey = later</p>
            </Card>
          </div>

          {/* Timeline of learning phases, one card per phase. */}
          <ol className="relative space-y-5 border-l border-(--color-line) pl-6">
            {r.roadmap.map((p) => (
              <li key={p.phase} className="relative">
                <span className="absolute -left-[33px] top-5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed border-(--color-accent) bg-(--color-bg)" />
                <Card eyebrow={`Phase ${p.phase} · ${p.weeks} week${p.weeks === 1 ? "" : "s"}`} title={p.title}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div><p className="mb-2 text-xs font-medium text-(--color-muted)">Goals</p><MarkedList items={p.goals} variant="add" /></div>
                    <div>
                      <p className="mb-2 text-xs font-medium text-(--color-muted)">Topics</p>
                      <div className="flex flex-wrap gap-2">{p.topics.map((t) => <span key={t} className="rounded-full border border-(--color-line) px-3 py-1 font-mono text-xs">{t}</span>)}</div>
                    </div>
                  </div>
                  {p.project && <p className="mt-4 text-sm"><span className="font-medium">Project:</span> <span className="text-(--color-muted)">{p.project}</span></p>}
                  {p.resources.length > 0 && <p className="mt-2 text-sm"><span className="font-medium">Resources:</span> <span className="text-(--color-muted)">{p.resources.join(" · ")}</span></p>}
                </Card>
              </li>
            ))}
          </ol>
          {/* General tips, shown only if present. */}
          {r.tips.length > 0 && <Card eyebrow="Tips" title="Keep momentum"><MarkedList items={r.tips} variant="add" /></Card>}
        </>
      )}
    </ToolShell>
  );
}
