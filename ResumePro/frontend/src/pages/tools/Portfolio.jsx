// Portfolio tool: turns a resume into a downloadable single-file portfolio website with an editable live preview.
import { useEffect, useRef, useState } from "react";
import { Globe, Download } from "lucide-react";
import toast from "react-hot-toast";
import ToolShell, { RunButton, AiNote } from "../../components/ToolShell";
import ResumePicker, { usePicker, pickerPayload, pickerReady } from "../../components/ResumePicker";
import Card from "../../components/Card";
import CopyButton from "../../components/CopyButton";
import { generatePortfolio } from "../../api/tools";

// Accent color choices (hex codes) offered to the user.
const ACCENTS = ["#005BB3", "#D8226C", "#F86A38", "#029456", "#B2DAE4", "#111111"];

// The portfolio generator page component.
export default function Portfolio() {
  // Resume source (saved resume or pasted text).
  const [input, setInput] = usePicker();
  // Chosen theme: dark or light.
  const [theme, setTheme] = useState("dark");
  // Chosen accent color.
  const [accent, setAccent] = useState("#005BB3");
  // True while the first generation is running.
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null); // { profile, html, aiUsed }
  // Ref (a value that survives re-renders without causing one) used to skip the preview refresh right after a full generation.
  const first = useRef(true);

  // Generates the portfolio (including the AI-written profile) from the resume.
  const generate = async () => {
    setBusy(true);
    try {
      // API call: returns the profile data and the generated HTML.
      setData(await generatePortfolio({ ...pickerPayload(input), theme, accent }));
      // Next effect run should be skipped because the HTML is already fresh.
      first.current = true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate the portfolio");
    } finally {
      setBusy(false);
    }
  };

  // Re-render (no AI call) whenever the profile text, theme or accent changes.
  const profile = data?.profile;
  // Debounced effect: 450 ms after the profile, theme or accent changes, ask the backend to rebuild the HTML only.
  useEffect(() => {
    // Nothing to refresh before the first generation.
    if (!profile) return;
    // Skip the refresh immediately after generate().
    if (first.current) { first.current = false; return; }
    // Wait briefly so we do not call the API on every keystroke.
    const t = setTimeout(() => {
      generatePortfolio({ profile, theme, accent })
        // Keep the edited profile and replace only the HTML.
        .then((d) => setData((prev) => ({ ...prev, html: d.html })))
        .catch(() => toast.error("Could not refresh the preview"));
    }, 450);
    // Cleanup: cancel a pending refresh if the inputs change again.
    return () => clearTimeout(t);
  }, [profile, theme, accent]);

  // Updates one field of the profile (name, about, skills...) as the user edits.
  const setField = (k, v) => setData((d) => ({ ...d, profile: { ...d.profile, [k]: v } }));
  // Downloads the generated HTML as a file.
  const download = () => {
    // Wrap the HTML in a Blob and create a temporary URL for it.
    const url = URL.createObjectURL(new Blob([data.html], { type: "text/html" }));
    // Create a hidden link with a filename based on the person's name.
    const a = Object.assign(document.createElement("a"), { href: url, download: `${(data.profile.name || "portfolio").replace(/\s+/g, "-").toLowerCase()}-portfolio.html` });
    // Click it to start the download.
    a.click();
    // Free the temporary URL.
    URL.revokeObjectURL(url);
  };
  // Shared CSS classes for the form fields.
  const field = "w-full rounded-lg border border-(--color-line) bg-(--color-surface-2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

  return (
    <ToolShell eyebrow="Portfolio" title="Portfolio website generator" description="Turn your resume into a responsive, single-file portfolio site. Download it and host it anywhere (GitHub Pages, Netlify, Vercel)." wide>
      {/* Input area: resume, style options and generate button. */}
      <div className="mx-auto max-w-4xl space-y-6">
        <ResumePicker value={input} onChange={setInput} />
        {/* Theme (dark/light) and accent color selectors. */}
        <Card eyebrow="Style" title="Theme & accent">
          <div className="flex flex-wrap items-center gap-6">
            <div className="inline-flex rounded-full border border-(--color-line) p-1">
              {["dark", "light"].map((t) => (
                <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${theme === t ? "bg-brand text-(--color-accent-ink)" : "text-(--color-muted)"}`}>{t}</button>
              ))}
            </div>
            <div className="flex items-center gap-2" role="group" aria-label="Accent colour">
              {ACCENTS.map((c) => (
                <button key={c} onClick={() => setAccent(c)} aria-label={`Accent ${c}`} aria-pressed={accent === c} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: accent === c ? "var(--color-ink)" : "transparent" }} />
              ))}
            </div>
          </div>
        </Card>
        {/* Button text changes after the first generation. */}
        <RunButton onClick={generate} busy={busy} disabled={!pickerReady(input)} idle={data ? "Regenerate from resume" : "Generate portfolio"} working="Generating…" icon={Globe} />
      </div>

      {/* Editor and live preview, shown once a portfolio exists. */}
      {data && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left column: editable fields and download/copy buttons. */}
          <div className="space-y-4 lg:col-span-2">
            <Card eyebrow="Edit" title="Hero & about">
              <div className="space-y-3">
                {/* Text inputs for name and headline. */}
                {[["name", "Name"], ["headline", "Headline"]].map(([k, label]) => (
                  <div key={k}><label className="mb-1 block text-xs font-medium text-(--color-muted)">{label}</label><input value={data.profile[k]} onChange={(e) => setField(k, e.target.value)} className={field} /></div>
                ))}
                <div><label className="mb-1 block text-xs font-medium text-(--color-muted)">About</label><textarea rows={5} value={data.profile.about} onChange={(e) => setField("about", e.target.value)} className={field} /></div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-(--color-muted)">Skills (comma-separated)</label>
                  <input value={data.profile.skills.join(", ")} onChange={(e) => setField("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={field} />
                </div>
              </div>
              <p className="mt-3 text-xs text-(--color-muted)">{data.profile.experience.length} role(s), {data.profile.projects.length} project(s), {data.profile.education.length} education entr{data.profile.education.length === 1 ? "y" : "ies"} included.</p>
              <div className="mt-2"><AiNote aiUsed={data.aiUsed} /></div>
            </Card>
            {/* Download the file or copy its HTML. */}
            <div className="flex flex-wrap gap-3">
              <button onClick={download} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-(--color-accent-ink) hover:opacity-90"><Download size={15} /> Download HTML</button>
              <CopyButton text={data.html} label="Copy HTML" />
            </div>
          </div>
          {/* Right column: preview. */}
          <div className="lg:col-span-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-(--color-muted)">Live preview</p>
            {/* Sandboxed iframe showing the generated HTML (srcDoc). */}
            <iframe title="Portfolio preview" sandbox="allow-scripts" srcDoc={data.html} className="h-[75vh] w-full rounded-2xl border border-(--color-line) bg-white" />
          </div>
        </div>
      )}
    </ToolShell>
  );
}
