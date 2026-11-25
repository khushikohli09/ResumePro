import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Trash2, Sparkles, Download, Save, ChevronDown, Printer, FileText, Image as ImageIcon } from "lucide-react";
import Card from "../components/Card";
import ResumePreview from "../templates/ResumePreview";
import { TEMPLATE_LIST, getTemplate } from "../templates/config";
import { exportTextPdf, exportStyledPdf } from "../templates/pdfExport";
import { generateBullets, generateSummary, saveBuilderResume, getResume } from "../api/resume";

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyExperience = () => ({ id: uid(), company: "", role: "", location: "", startDate: "", endDate: "", bullets: [] });
const emptyEducation = () => ({ id: uid(), school: "", degree: "", startDate: "", endDate: "", grade: "" });
const emptyProject = () => ({ id: uid(), name: "", description: "", link: "", tech: "" });
const EMPTY_PERSONAL = { fullName: "", email: "", phone: "", location: "", linkedin: "", website: "" };

const inputCls = "w-full rounded-lg border border-(--color-line) bg-(--color-surface-2) px-3 py-2 text-sm outline-none focus:border-(--color-accent)";
const ghostBtn = "inline-flex items-center gap-1 rounded-full border border-(--color-line) px-3 py-1 text-xs font-medium hover:border-(--color-accent) hover:text-(--color-accent)";
const aiBtn = "inline-flex items-center gap-1.5 rounded-full border border-(--color-accent) px-3 py-1 text-xs font-medium text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-accent-ink) disabled:opacity-50";

function Field({ label, ...props }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-(--color-muted)">{label}</label>
      <input {...props} className={inputCls} />
    </div>
  );
}

const Remove = ({ onClick }) => (
  <div className="flex justify-end">
    <button onClick={onClick} aria-label="Remove" className="text-(--color-muted) hover:text-(--color-accent)"><Trash2 size={14} /></button>
  </div>
);

export default function Builder() {
  const { id } = useParams();
  const previewRef = useRef(null);

  const [title, setTitle] = useState("Untitled Resume");
  const [template, setTemplate] = useState("professional");
  const [targetRole, setTargetRole] = useState("");
  const [personal, setPersonal] = useState(EMPTY_PERSONAL);
  const [summary, setSummary] = useState("");
  const [experience, setExperience] = useState([emptyExperience()]);
  const [education, setEducation] = useState([emptyEducation()]);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [savedId, setSavedId] = useState(id || null);
  const [busy, setBusy] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bulletDrafts, setBulletDrafts] = useState({});

  const builderData = { template, targetRole, personal, summary, experience, education, projects, skills };

  // Load an existing builder resume when opened via /builder/:id
  useEffect(() => {
    if (!id) return;
    getResume(id)
      .then((r) => {
        if (r.source !== "builder" || !r.builderData) return toast.error("That resume wasn't created in the builder");
        const d = r.builderData;
        setTitle(r.title);
        setTemplate(d.template || "professional");
        setTargetRole(d.targetRole || "");
        setPersonal({ ...EMPTY_PERSONAL, ...d.personal });
        setSummary(d.summary || "");
        setExperience(d.experience || []);
        setEducation(d.education || []);
        setProjects(d.projects || []);
        setSkills(d.skills || []);
        setSavedId(r._id);
      })
      .catch(() => toast.error("Could not load that resume"));
  }, [id]);

  const patch = (setter) => (itemId, key, value) => setter((arr) => arr.map((x) => (x.id === itemId ? { ...x, [key]: value } : x)));
  const patchExp = patch(setExperience);
  const patchEdu = patch(setEducation);
  const patchProj = patch(setProjects);
  const drop = (setter) => (itemId) => setter((arr) => arr.filter((x) => x.id !== itemId));

  const run = async (key, fn, okMsg, failMsg) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
    } catch (err) {
      toast.error(err.response?.data?.message || failMsg);
    } finally {
      setBusy(null);
    }
  };

  const onGenerateSummary = () => {
    if (!targetRole.trim()) return toast.error("Enter a target role first");
    run("summary", async () => setSummary(await generateSummary(targetRole, undefined, skills.join(", "))), "Summary generated", "Could not generate summary");
  };

  const onGenerateBullets = (expId, role) => {
    const raw = bulletDrafts[expId];
    if (!raw?.trim()) return toast.error("Describe what you did in this role first");
    run(`bullets-${expId}`, async () => {
      const bullets = await generateBullets(raw, role || targetRole);
      setExperience((arr) => arr.map((e) => (e.id === expId ? { ...e, bullets: [...e.bullets, ...bullets] } : e)));
      setBulletDrafts((d) => ({ ...d, [expId]: "" }));
    }, "Bullets added", "Could not generate bullets");
  };

  const onSave = () =>
    run("save", async () => setSavedId((await saveBuilderResume(savedId, title, builderData))._id), "Resume saved", "Could not save resume");

  const fileName = (title || "resume").replace(/[^\w\- ]+/g, "").trim() || "resume";
  const onExport = (kind) => {
    setMenuOpen(false);
    if (kind === "print") return window.print();
    if (kind === "text") return run("pdf", async () => exportTextPdf(builderData, template, fileName), "PDF downloaded", "Could not export PDF");
    run("pdf", () => exportStyledPdf(previewRef.current, fileName), "PDF downloaded", "Could not export PDF");
  };

  const tpl = getTemplate(template);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Resume title"
          className="border-b border-transparent bg-transparent font-display text-2xl font-semibold outline-none focus:border-(--color-accent)"
        />
        <div className="flex gap-3">
          <button onClick={onSave} disabled={busy === "save"} className="inline-flex items-center gap-2 rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium hover:border-(--color-accent) hover:text-(--color-accent) disabled:opacity-50">
            <Save size={15} /> {busy === "save" ? "Saving…" : "Save"}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} disabled={busy === "pdf"} className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-(--color-accent-ink) hover:opacity-90 disabled:opacity-50">
              <Download size={15} /> {busy === "pdf" ? "Exporting…" : "Export"} <ChevronDown size={14} />
            </button>
            {menuOpen && (
              <div className="paper-card absolute right-0 z-30 mt-2 w-72 rounded-xl p-1 shadow-lg">
                {[
                  ["text", FileText, "PDF · ATS text", "Selectable text that applicant systems can read"],
                  ["styled", ImageIcon, "PDF · exact look", "Matches the preview; image-based, not machine-readable"],
                  ["print", Printer, "Print / Save as PDF", "Browser dialog, keeps vector text and styling"],
                ].map(([k, Icon, label, hint]) => (
                  <button key={k} onClick={() => onExport(k)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-(--color-surface-2)">
                    <Icon size={16} className="mt-0.5 shrink-0 text-(--color-accent)" />
                    <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-(--color-muted)">{hint}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* FORM */}
        <div className="space-y-6">
          <Card eyebrow="Layout" title="Template">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATE_LIST.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  aria-pressed={template === t.id}
                  className={`rounded-xl border px-3 py-2 text-left transition-colors ${template === t.id ? "border-(--color-accent) bg-(--color-surface-2)" : "border-(--color-line) hover:border-(--color-accent)"}`}
                >
                  <span className="block text-sm font-medium">{t.label}{t.atsSafe && <span className="ml-1 font-mono text-[10px] text-(--color-good)">ATS</span>}</span>
                  <span className="block text-[11px] text-(--color-muted)">{t.audience}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-(--color-muted)">{tpl.description} Switching templates never changes your content.</p>
          </Card>

          <Card eyebrow="Target" title="What role are you targeting?">
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Senior Backend Engineer" className={inputCls} />
          </Card>

          <Card eyebrow="Contact" title="Personal details">
            <div className="grid gap-3 sm:grid-cols-2">
              {[["fullName", "Full name"], ["email", "Email"], ["phone", "Phone"], ["location", "Location"], ["linkedin", "LinkedIn"], ["website", "Website / GitHub"]].map(([k, label]) => (
                <Field key={k} label={label} value={personal[k]} onChange={(e) => setPersonal({ ...personal, [k]: e.target.value })} />
              ))}
            </div>
          </Card>

          <Card eyebrow="AI-assisted" title="Summary" action={<button onClick={onGenerateSummary} disabled={busy === "summary"} className={aiBtn}><Sparkles size={13} /> {busy === "summary" ? "Writing…" : "Generate"}</button>}>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} placeholder="A 2-3 sentence professional summary…" className={inputCls} />
          </Card>

          <Card eyebrow="AI-assisted" title="Experience" action={<button onClick={() => setExperience((e) => [...e, emptyExperience()])} className={ghostBtn}><Plus size={13} /> Add</button>}>
            <div className="space-y-6">
              {experience.map((exp) => (
                <div key={exp.id} className="rounded-xl border border-(--color-line) p-4">
                  <Remove onClick={() => drop(setExperience)(exp.id)} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role" value={exp.role} onChange={(e) => patchExp(exp.id, "role", e.target.value)} />
                    <Field label="Company" value={exp.company} onChange={(e) => patchExp(exp.id, "company", e.target.value)} />
                    <Field label="Start date" value={exp.startDate} onChange={(e) => patchExp(exp.id, "startDate", e.target.value)} placeholder="Jan 2023" />
                    <Field label="End date" value={exp.endDate} onChange={(e) => patchExp(exp.id, "endDate", e.target.value)} placeholder="Present" />
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {exp.bullets.map((b, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 text-sm">
                          <span className="mark-add">{b}</span>
                          <button onClick={() => patchExp(exp.id, "bullets", exp.bullets.filter((_, bi) => bi !== i))} aria-label="Remove bullet" className="shrink-0 text-(--color-muted) hover:text-(--color-accent)"><Trash2 size={12} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      value={bulletDrafts[exp.id] || ""}
                      onChange={(e) => setBulletDrafts((d) => ({ ...d, [exp.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        // Enter adds your own bullet as-is; the Write button rewrites it with AI
                        if (e.key === "Enter" && bulletDrafts[exp.id]?.trim()) {
                          e.preventDefault();
                          patchExp(exp.id, "bullets", [...exp.bullets, bulletDrafts[exp.id].trim()]);
                          setBulletDrafts((d) => ({ ...d, [exp.id]: "" }));
                        }
                      }}
                      placeholder="Describe an achievement. Enter = add as-is, Write = AI rewrite"
                      className={inputCls}
                    />
                    <button onClick={() => onGenerateBullets(exp.id, exp.role)} disabled={busy === `bullets-${exp.id}`} className={`${aiBtn} shrink-0 rounded-lg px-3 py-2`}>
                      <Sparkles size={13} /> {busy === `bullets-${exp.id}` ? "…" : "Write"}
                    </button>
                  </div>
                </div>
              ))}
              {experience.length === 0 && <p className="text-sm text-(--color-muted)">No experience added. Freshers can list internships here.</p>}
            </div>
          </Card>

          <Card eyebrow="Optional" title="Projects" action={<button onClick={() => setProjects((p) => [...p, emptyProject()])} className={ghostBtn}><Plus size={13} /> Add</button>}>
            <div className="space-y-4">
              {projects.map((p) => (
                <div key={p.id} className="rounded-xl border border-(--color-line) p-4">
                  <Remove onClick={() => drop(setProjects)(p.id)} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Name" value={p.name} onChange={(e) => patchProj(p.id, "name", e.target.value)} />
                    <Field label="Link" value={p.link} onChange={(e) => patchProj(p.id, "link", e.target.value)} />
                    <div className="sm:col-span-2"><Field label="Tech stack" value={p.tech} onChange={(e) => patchProj(p.id, "tech", e.target.value)} placeholder="React, Node.js, MongoDB" /></div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-(--color-muted)">Description</label>
                    <textarea value={p.description} onChange={(e) => patchProj(p.id, "description", e.target.value)} rows={2} className={inputCls} />
                  </div>
                </div>
              ))}
              {projects.length === 0 && <p className="text-sm text-(--color-muted)">No projects added yet.</p>}
            </div>
          </Card>

          <Card eyebrow="Background" title="Education" action={<button onClick={() => setEducation((e) => [...e, emptyEducation()])} className={ghostBtn}><Plus size={13} /> Add</button>}>
            <div className="space-y-4">
              {education.map((ed) => (
                <div key={ed.id} className="rounded-xl border border-(--color-line) p-4">
                  <Remove onClick={() => drop(setEducation)(ed.id)} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Degree" value={ed.degree} onChange={(e) => patchEdu(ed.id, "degree", e.target.value)} />
                    <Field label="School" value={ed.school} onChange={(e) => patchEdu(ed.id, "school", e.target.value)} />
                    <Field label="Start date" value={ed.startDate} onChange={(e) => patchEdu(ed.id, "startDate", e.target.value)} />
                    <Field label="End date" value={ed.endDate} onChange={(e) => patchEdu(ed.id, "endDate", e.target.value)} />
                    <div className="sm:col-span-2"><Field label="Grade / CGPA (optional)" value={ed.grade || ""} onChange={(e) => patchEdu(ed.id, "grade", e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card eyebrow="Keywords" title="Skills">
            <div className="mb-3 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full border border-(--color-line) px-3 py-1 font-mono text-xs">
                  {s}
                  <button onClick={() => setSkills((arr) => arr.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="text-(--color-muted) hover:text-(--color-accent)"><Trash2 size={11} /></button>
                </span>
              ))}
            </div>
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && skillInput.trim()) {
                  e.preventDefault();
                  setSkills((s) => Array.from(new Set([...s, ...skillInput.split(",").map((x) => x.trim()).filter(Boolean)])));
                  setSkillInput("");
                }
              }}
              placeholder="Type a skill (or several, comma-separated) and press Enter"
              className={inputCls}
            />
          </Card>
        </div>

        {/* PREVIEW */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-(--color-muted)">Live preview · {tpl.label}</p>
          <div className="max-h-[80vh] overflow-y-auto rounded-2xl border border-(--color-line) bg-(--color-surface-2) p-4">
            <ResumePreview ref={previewRef} data={builderData} template={template} />
          </div>
        </div>
      </div>
    </div>
  );
}
