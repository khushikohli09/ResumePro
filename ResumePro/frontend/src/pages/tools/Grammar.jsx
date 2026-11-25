// Grammar and wording tool: finds grammar errors, weak verbs, repetition and vague statements in a resume.
import { useState } from "react";
import { SpellCheck } from "lucide-react";
import toast from "react-hot-toast";
import ToolShell, { RunButton, AiNote, sevColor } from "../../components/ToolShell";
import ResumePicker, { usePicker, pickerPayload, pickerReady } from "../../components/ResumePicker";
import ScoreStamp from "../../components/ScoreStamp";
import Card from "../../components/Card";
import { checkGrammar } from "../../api/tools";

// Filter buttons: [value, label] pairs.
const TYPES = [["all", "All"], ["grammar", "Grammar"], ["weak-verb", "Weak verbs"], ["repetition", "Repetition"], ["vague", "Vague"], ["style", "Style"]];
// Human-friendly names for the issue types returned by the backend.
const TYPE_LABEL = { grammar: "Grammar", "weak-verb": "Weak verb", repetition: "Repetition", vague: "Vague", style: "Style" };

// The grammar tool page component.
export default function Grammar() {
  // Resume source (saved resume or pasted text).
  const [input, setInput] = usePicker();
  // True while the check is running.
  const [busy, setBusy] = useState(false);
  // The backend's report; null until a check has finished.
  const [result, setResult] = useState(null);
  // Currently selected issue type filter.
  const [filter, setFilter] = useState("all");

  // Runs when the user clicks the check button.
  const run = async () => {
    setBusy(true);
    try {
      // API call: send the resume to the backend and store the report.
      setResult(await checkGrammar(pickerPayload(input)));
      // Reset the filter to "all" for the new report.
      setFilter("all");
    } catch (err) {
      toast.error(err.response?.data?.message || "Check failed");
    } finally {
      setBusy(false);
    }
  };

  // Issues to display: all of them, or only those matching the selected filter (empty before a result).
  const issues = result ? result.issues.filter((i) => filter === "all" || i.type === filter) : [];

  return (
    <ToolShell eyebrow="Writing quality" title="Grammar & wording checker" description="Catches grammar errors, weak verbs, repetition and vague statements, and tells you exactly how to fix each one.">
      {/* Resume picker. */}
      <ResumePicker value={input} onChange={setInput} />
      {/* Run button; disabled until the picker has valid input. */}
      <RunButton onClick={run} busy={busy} disabled={!pickerReady(input)} idle="Check my resume" working="Checking…" icon={SpellCheck} />

      {/* Only show results once a report exists. */}
      {result && (
        <>
          {/* Summary card: writing score, issue count and filter buttons. */}
          <Card className="flex flex-wrap items-center gap-8">
            <ScoreStamp score={result.score} label="Writing score" size={104} />
            <div className="flex-1">
              <p className="font-display text-lg font-semibold">{result.total === 0 ? "No issues found" : `${result.total} issue${result.total === 1 ? "" : "s"} to review`}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* One filter button per issue type, with the count for that type. */}
                {TYPES.map(([k, label]) => (
                  <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${filter === k ? "border-(--color-accent) text-(--color-accent)" : "border-(--color-line) text-(--color-muted) hover:text-(--color-ink)"}`}>
                    {label}{k !== "all" && ` ${result.counts[k] || 0}`}
                  </button>
                ))}
              </div>
              <div className="mt-3"><AiNote aiUsed={result.aiUsed} /></div>
            </div>
          </Card>

          {/* List of issues that pass the filter. */}
          <div className="space-y-3">
            {/* One card per issue; the left border color shows severity. */}
            {issues.map((i, n) => (
              <div key={n} className="paper-card rounded-xl p-4" style={{ borderLeft: `3px solid ${sevColor(i.severity)}` }}>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-(--color-muted)">
                  <span style={{ color: sevColor(i.severity) }}>{TYPE_LABEL[i.type] || i.type}</span>
                  <span>· {i.severity}</span>
                  {i.line > 0 && <span>· line {i.line}</span>}
                  {i.source === "ai" && <span className="rounded border border-(--color-line) px-1.5">AI</span>}
                </div>
                {i.text && <p className="mt-2 rounded-lg bg-(--color-surface-2) px-3 py-2 font-mono text-xs">{i.text}</p>}
                <p className="mt-2 text-sm">{i.message}</p>
                {i.suggestion && i.suggestion !== i.message && <p className="mark-add mt-1 text-sm text-(--color-muted)">{i.suggestion}</p>}
              </div>
            ))}
            {/* Message when the selected category has no issues. */}
            {issues.length === 0 && <p className="text-sm text-(--color-muted)">Nothing in this category.</p>}
          </div>
        </>
      )}
    </ToolShell>
  );
}
