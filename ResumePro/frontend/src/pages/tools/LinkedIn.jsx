// LinkedIn tool: generates headline options, an About section and role descriptions from a resume.
import { useState } from "react";
import { UserRound } from "lucide-react";
import toast from "react-hot-toast";
import ToolShell, { RunButton, AiNote } from "../../components/ToolShell";
import ResumePicker, { usePicker, pickerPayload, pickerReady } from "../../components/ResumePicker";
import Card from "../../components/Card";
import CopyButton from "../../components/CopyButton";
import MarkedList from "../../components/MarkedList";
import { getLinkedInSuggestions } from "../../api/tools";

// The LinkedIn suggestions page component.
export default function LinkedIn() {
  // Resume source (saved resume or pasted text).
  const [input, setInput] = usePicker();
  // Optional target role to tailor the text.
  const [role, setRole] = useState("");
  // Writing tone chosen in the dropdown.
  const [tone, setTone] = useState("professional");
  // True while the request is running.
  const [busy, setBusy] = useState(false);
  // The generated suggestions; null until loaded.
  const [r, setR] = useState(null);

  // Runs when the user clicks the generate button.
  const run = async () => {
    setBusy(true);
    try {
      // API call: send resume, target role and tone to the backend.
      setR(await getLinkedInSuggestions(pickerPayload(input), role, tone));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate suggestions");
    } finally {
      setBusy(false);
    }
  };

  // Shared CSS classes for the form fields.
  const field = "rounded-lg border border-(--color-line) bg-(--color-surface-2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

  return (
    <ToolShell eyebrow="LinkedIn" title="LinkedIn profile suggestions" description="Headlines, an About section and experience descriptions written from the facts in your resume.">
      {/* Resume picker. */}
      <ResumePicker value={input} onChange={setInput} />
      {/* Options: target role and tone. */}
      <Card eyebrow="Options" title="Make it yours">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-muted)">Target role (optional)</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Full Stack Developer" className={`w-full ${field}`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-(--color-muted)">Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className={`w-full ${field}`}>
              <option value="professional">Professional</option><option value="friendly">Friendly</option><option value="bold">Bold</option>
            </select>
          </div>
        </div>
      </Card>
      {/* Run button; disabled until the picker has valid input. */}
      <RunButton onClick={run} busy={busy} disabled={!pickerReady(input)} idle="Generate suggestions" working="Writing…" icon={UserRound} />

      {/* Only show results once they exist. */}
      {r && (
        <>
          {/* Note about whether AI was used. */}
          <AiNote aiUsed={r.aiUsed} />
          {/* Headline options, each with a copy button and a length counter (LinkedIn limit is 220). */}
          <Card eyebrow="Headline" title="Pick one">
            <ul className="space-y-2">
              {r.headlines.map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-(--color-surface-2) px-3 py-2 text-sm">
                  <span>{h} <span className="font-mono text-[10px] text-(--color-muted)">{h.length}/220</span></span>
                  <CopyButton text={h} />
                </li>
              ))}
            </ul>
          </Card>
          {/* About section with a copy button in the card header. */}
          <Card eyebrow="About" title="About section" action={<CopyButton text={r.about} />}>
            <p className="whitespace-pre-line text-sm leading-relaxed">{r.about}</p>
          </Card>
          {/* Role descriptions, only when the resume has experience entries. */}
          {r.experience.length > 0 && (
            <Card eyebrow="Experience" title="Role descriptions">
              <div className="space-y-4">
                {r.experience.map((e, i) => (
                  <div key={i} className="rounded-xl border border-(--color-line) p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{e.role}{e.company && <span className="font-normal text-(--color-muted)"> · {e.company}</span>}</p>
                      <CopyButton text={e.description} />
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-(--color-muted)">{e.description || "Add bullet points to this role in your resume to generate a description."}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {/* Suggested skills and a profile checklist side by side. */}
          <div className="grid gap-6 md:grid-cols-2">
            {r.skillsToAdd.length > 0 && (
              <Card eyebrow="Skills" title="Add these to your profile">
                <div className="flex flex-wrap gap-2">{r.skillsToAdd.map((s) => <span key={s} className="rounded-full border border-(--color-line) px-3 py-1 font-mono text-xs">{s}</span>)}</div>
              </Card>
            )}
            <Card eyebrow="Tips" title="Profile checklist"><MarkedList items={r.tips} variant="add" /></Card>
          </div>
        </>
      )}
    </ToolShell>
  );
}
