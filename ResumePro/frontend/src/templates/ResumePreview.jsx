// On-screen resume preview. Reads the chosen template config and draws each section as HTML.
// forwardRef lets a parent grab the DOM node (used to export it as an image-based PDF).
import { forwardRef } from "react";
import { getTemplate, normalizeResume, contactLine, dates } from "./config";

// Always rendered on white with fixed colours (independent of the app theme),
// because this is a document that gets printed or exported.
const INK = "#0a0d14";
const MUTED = "#334155";

// Component props: data = the resume content, template = template id (falls back to the id saved in data).
const ResumePreview = forwardRef(function ResumePreview({ data, template }, ref) {
  // cfg = template settings; r = cleaned-up resume content (see config.js).
  const cfg = getTemplate(template || data?.template);
  const r = normalizeResume(data);
  const center = cfg.headerAlign === "center";
  const atsSafe = !!cfg.atsSafe;

  // Section heading; its look depends on cfg.headingStyle.
  const Heading = ({ children }) => {
    const base = { margin: "18px 0 6px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 };
    if (cfg.headingStyle === "plain") return <h2 style={{ ...base, color: "#000", borderBottom: "1px solid #000", paddingBottom: 2 }}>{children}</h2>;
    if (cfg.headingStyle === "accent") return <h2 style={{ ...base, color: cfg.accent, fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontWeight: 600 }}>{children}</h2>;
    return <h2 style={{ ...base, color: cfg.accent, borderBottom: `1.5px solid ${cfg.accent}`, paddingBottom: 3 }}>{children}</h2>;
  };

  // A title row with an optional right-hand part (e.g. dates). ATS-safe templates use one plain line
  // "left | right" instead of a two-column layout, which parsers read more reliably.
  const Row = ({ left, right }) =>
    atsSafe ? (
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{[left, right].filter(Boolean).join(" | ")}</p>
    ) : (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{left}</span>
        <span style={{ fontSize: 12, color: MUTED, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>{right}</span>
      </div>
    );

  // Map of section key -> ready-made JSX (or false/empty when the section has no data).
  // `cond && <jsx>` renders nothing when cond is falsy.
  const sections = {
    summary: r.summary && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{r.summary}</p>,

    skills: r.skills.length > 0 && (
      cfg.skillsStyle === "chips" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {r.skills.map((s) => (
            <span key={s} style={{ border: `1px solid ${cfg.accent}55`, borderRadius: 999, padding: "2px 10px", fontSize: 11.5, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>{s}</span>
          ))}
        </div>
      ) : cfg.skillsStyle === "grid" ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 16px", fontSize: 13 }}>
          {r.skills.map((s) => <li key={s}>▪ {s}</li>)}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{r.skills.join(atsSafe ? ", " : " · ")}</p>
      )
    ),

    experience: r.experience.length > 0 && r.experience.map((e) => (
      <div key={e.id} style={{ marginBottom: 12 }}>
        <Row left={[e.role, e.company].filter(Boolean).join(atsSafe ? ", " : " · ")} right={dates(e.startDate, e.endDate)} />
        {e.location && <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{e.location}</p>}
        {(e.bullets || []).length > 0 && (
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.55 }}>
            {e.bullets.map((b, i) => <li key={i} style={{ marginBottom: 2 }}>{b}</li>)}
          </ul>
        )}
      </div>
    )),

    projects: r.projects.length > 0 && r.projects.map((p) => (
      <div key={p.id} style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
          {p.name}
          {p.link && <span style={{ fontWeight: 400, color: MUTED }}> {atsSafe ? `(${p.link})` : `— ${p.link}`}</span>}
        </p>
        {p.tech && <p style={{ margin: "1px 0 0", fontSize: 12, color: cfg.id === "developer" ? cfg.accent : MUTED, fontFamily: cfg.id === "developer" ? "'IBM Plex Mono', ui-monospace, monospace" : undefined }}>{p.tech}</p>}
        {p.description && <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.55 }}>{p.description}</p>}
      </div>
    )),

    education: r.education.length > 0 && r.education.map((e) => (
      <div key={e.id} style={{ marginBottom: 6 }}>
        <Row left={[e.degree, e.school].filter(Boolean).join(atsSafe ? ", " : " · ")} right={dates(e.startDate, e.endDate)} />
        {e.grade && <p style={{ margin: 0, fontSize: 12, color: MUTED }}>{e.grade}</p>}
      </div>
    )),
  };

  // The page itself: id="resume-preview" is also what the print CSS in index.css targets.
  return (
    <div
      ref={ref}
      id="resume-preview"
      style={{ background: "#fff", color: INK, fontFamily: cfg.font, padding: "40px 44px", maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box", minHeight: 600 }}
    >
      <header style={{ textAlign: center ? "center" : "left", ...(cfg.id === "developer" ? { borderLeft: `4px solid ${cfg.accent}`, paddingLeft: 14 } : {}) }}>
        <h1 style={{ margin: 0, fontSize: atsSafe ? 24 : 28, fontWeight: 700, letterSpacing: cfg.id === "business" ? "0.04em" : "-0.01em", textTransform: cfg.id === "business" ? "uppercase" : "none" }}>
          {r.personal.fullName || "Your Name"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: MUTED }}>
          {contactLine(r.personal).join(atsSafe ? " | " : "  ·  ")}
        </p>
      </header>

      {/* Render sections in the template's order, skipping empty ones. */}
      {cfg.order.map((key) =>
        sections[key] ? (
          <section key={key}>
            <Heading>{cfg.titles[key]}</Heading>
            {sections[key]}
          </section>
        ) : null
      )}
    </div>
  );
});

export default ResumePreview;
