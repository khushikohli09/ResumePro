// Authenticity checker tool: looks for things a recruiter might question (date gaps, inflated claims, copied text, keyword stuffing).
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import ToolShell, { RunButton, AiNote, sevColor } from "../../components/ToolShell";
import ResumePicker, { usePicker, pickerPayload, pickerReady } from "../../components/ResumePicker";
import ScoreStamp from "../../components/ScoreStamp";
import Card from "../../components/Card";
import { checkAuthenticity } from "../../api/tools";

// The authenticity tool page component.
export default function Authenticity() {
  // Resume source (saved resume or pasted text); the custom hook also reads `?resume=` from the URL.
  const [input, setInput] = usePicker();
  // Optional job description, used to detect text copied from it.
  const [jd, setJd] = useState("");
  // True while the check is running (disables the button).
  const [busy, setBusy] = useState(false);
  // The backend's report; null until a check has finished.
  const [result, setResult] = useState(null);

  // Runs when the user clicks the run button.
  const run = async () => {
    setBusy(true);
    try {
      // API call: send the resume (or text) and job description to the backend and store the report.
      setResult(await checkAuthenticity(pickerPayload(input), jd));
    } catch (err) {
      // Show the server's error message if there is one.
      toast.error(err.response?.data?.message || "Check failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell eyebrow="Credibility" title="Resume authenticity checker" description="Shows the things a recruiter would question: timeline problems, inflated claims, copied text and keyword stuffing, so you can fix them first.">
      {/* Choose which resume to check. */}
      <ResumePicker value={input} onChange={setInput} />
      {/* Optional job description. */}
      <Card eyebrow="Optional" title="Job description">
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={4} placeholder="Paste a job description to detect text copied from it…" className="w-full rounded-lg border border-(--color-line) bg-(--color-surface-2) p-3 text-sm outline-none focus:border-(--color-accent)" />
      </Card>
      {/* Run button; disabled until the picker has valid input. */}
      <RunButton onClick={run} busy={busy} disabled={!pickerReady(input)} idle="Run credibility check" working="Checking…" icon={ShieldCheck} />

      {/* Only show results once a report exists. */}
      {result && (
        <>
          {/* Summary card: credibility score, verdict and quick stats. */}
          <Card className="flex flex-wrap items-center gap-8">
            <ScoreStamp score={result.score} label="Credibility" size={104} />
            <div className="flex-1">
              <p className="font-display text-lg font-semibold">{result.verdict}</p>
              <p className="mt-1 font-mono text-xs text-(--color-muted)">{result.stats.datedRoles} dated role(s) · ~{result.stats.computedYears} yrs experience · {result.stats.skillsDetected} skills detected</p>
              <p className="mt-3 text-sm text-(--color-muted)">{result.disclaimer}</p>
              <div className="mt-3"><AiNote aiUsed={result.aiUsed} /></div>
            </div>
          </Card>

          {/* List of flagged problems (or a message when nothing is wrong). */}
          <div className="space-y-3">
            {result.flags.length === 0 && <p className="text-sm text-(--color-good)">Nothing stands out. Your timeline and claims look consistent.</p>}
            {/* One card per flag; the left border color shows severity. */}
            {result.flags.map((f, n) => (
              <div key={n} className="paper-card rounded-xl p-4" style={{ borderLeft: `3px solid ${sevColor(f.severity)}` }}>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-(--color-muted)">
                  <span style={{ color: sevColor(f.severity) }}>{f.severity}</span>
                  {f.source === "ai" && <span className="rounded border border-(--color-line) px-1.5">AI</span>}
                </div>
                <h3 className="mt-1 font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-(--color-muted)">{f.detail}</p>
                {f.evidence && <p className="mt-2 rounded-lg bg-(--color-surface-2) px-3 py-2 font-mono text-xs">{f.evidence}</p>}
                {f.fix && <p className="mark-add mt-2 text-sm">{f.fix}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </ToolShell>
  );
}
