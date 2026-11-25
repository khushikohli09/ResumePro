import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listResumes } from "../api/resume";

// Shared input for every AI tool: pick a saved resume or paste text.
// Header: this file holds the picker UI plus three small helpers that tools use to manage its value.
// Shared input for every AI tool: pick a saved resume or paste text.
// Hook that creates the picker's state. Starts in "saved" mode and preselects the resume id from the `?resume=` URL parameter, if present.
export function usePicker() {
  const [sp] = useSearchParams();
  return useState({ mode: "saved", resumeId: sp.get("resume") || "", text: "" });
}
// Turns the picker value into the request body the backend expects: a resume id or raw text.
export const pickerPayload = (v) => (v.mode === "saved" ? { resumeId: v.resumeId } : { text: v.text });
// True when input is usable: a resume is selected, or pasted text is at least 50 characters.
export const pickerReady = (v) => (v.mode === "saved" ? !!v.resumeId : v.text.trim().length >= 50);

// The picker UI. `value` and `onChange` are controlled by the parent page (it owns the state).
export default function ResumePicker({ value, onChange }) {
  // List of the user's saved resumes; `null` means "still loading".
  const [resumes, setResumes] = useState(null);

  // On first render, fetch the user's saved resumes from the API.
  useEffect(() => {
    listResumes()
      .then((r) => {
        // No saved resumes: switch to paste mode automatically.
        setResumes(r);
        if (r.length === 0) onChange((v) => ({ ...v, mode: "paste" }));
        // Otherwise, if nothing is selected yet, select the first (most recent) resume.
        else if (!value.resumeId) onChange((v) => ({ ...v, resumeId: r[0]._id }));
      })
      // If the request fails, treat it as an empty list so the page still works.
      .catch(() => setResumes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="paper-card rounded-2xl p-5">
      <div className="inline-flex rounded-full border border-(--color-line) p-1">
        {/* Two tab-like buttons switch between choosing a saved resume and pasting text. */}
        {[["saved", "Saved resume"], ["paste", "Paste text"]].map(([m, label]) => (
          <button key={m} onClick={() => onChange({ ...value, mode: m })} className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${value.mode === m ? "bg-brand text-(--color-accent-ink)" : "text-(--color-muted)"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {/* Three cases in saved mode: still loading, no resumes, or a dropdown of resumes. Paste mode shows a textarea. */}
        {value.mode === "saved" ? (
          resumes === null ? (
            <p className="text-sm text-(--color-muted)">Loading your resumes…</p>
          ) : resumes.length === 0 ? (
            <p className="text-sm text-(--color-muted)">No saved resumes yet. <Link to="/analyze" className="text-(--color-accent)">Upload one</Link> or <Link to="/builder" className="text-(--color-accent)">build one</Link>.</p>
          ) : (
            <select value={value.resumeId} onChange={(e) => onChange({ ...value, resumeId: e.target.value })} aria-label="Saved resume" className="w-full rounded-lg border border-(--color-line) bg-(--color-surface-2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)">
              {resumes.map((r) => <option key={r._id} value={r._id}>{r.title} · {r.source === "builder" ? "built" : "uploaded"}</option>)}
            </select>
          )
        ) : (
          <textarea value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} rows={9} placeholder="Paste your resume text here (at least a few lines)…" className="w-full rounded-lg border border-(--color-line) bg-(--color-surface-2) p-3 text-sm outline-none focus:border-(--color-accent)" />
        )}
      </div>
    </div>
  );
}
