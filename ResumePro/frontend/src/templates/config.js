// Pure data (no JSX) so both the on-screen preview and the PDF exporter share
// one definition of each template. Switching templates only changes this
// config, never the resume content.

// TEMPLATES: one entry per resume design. Fields:
//   id / label / audience / description  - identity and text shown in the template picker
//   atsSafe      - plain, machine-readable layout (no colour, single column) for applicant tracking systems
//   font         - CSS font stack used on screen (ResumePreview)
//   pdfFont      - built-in jsPDF font (helvetica/times) used by the text PDF export
//   accent       - hex colour for headings and highlights
//   headingStyle - "plain" (black underline), "rule" (accent underline) or "accent" (coloured mono text)
//   headerAlign  - "left" or "center" for the name/contact block
//   skillsStyle  - how skills are drawn: "inline" text, "chips" pills or a "grid"
//   order        - which sections appear, and in what order
//   titles       - the heading text for each section in this template
export const TEMPLATES = {
  ats: {
    id: "ats",
    label: "ATS-Safe",
    audience: "Any role · online applications",
    description: "Single column, standard headings, plain text, no colours or icons. Best for applicant tracking systems.",
    atsSafe: true,
    font: "Arial, Helvetica, sans-serif",
    pdfFont: "helvetica",
    accent: "#000000",
    headingStyle: "plain",
    headerAlign: "left",
    skillsStyle: "inline",
    order: ["summary", "skills", "experience", "projects", "education"],
    titles: { summary: "Professional Summary", skills: "Skills", experience: "Work Experience", projects: "Projects", education: "Education" },
  },
  fresher: {
    id: "fresher",
    label: "Fresher",
    audience: "Students · first job",
    description: "Leads with education, projects and skills. Experience becomes internships.",
    font: "Inter, ui-sans-serif, sans-serif",
    pdfFont: "helvetica",
    accent: "#2e7d5b",
    headingStyle: "rule",
    headerAlign: "left",
    skillsStyle: "chips",
    order: ["summary", "education", "projects", "skills", "experience"],
    titles: { summary: "Career Objective", experience: "Internships & Experience", education: "Education", projects: "Projects", skills: "Technical Skills" },
  },
  professional: {
    id: "professional",
    label: "Professional",
    audience: "Experienced professionals",
    description: "Experience-first with a classic serif look and a concise summary.",
    font: "Georgia, 'Times New Roman', serif",
    pdfFont: "times",
    accent: "#1f2a44",
    headingStyle: "rule",
    headerAlign: "left",
    skillsStyle: "inline",
    order: ["summary", "experience", "skills", "education", "projects"],
    titles: { summary: "Profile", experience: "Professional Experience", skills: "Core Skills", education: "Education", projects: "Selected Projects" },
  },
  developer: {
    id: "developer",
    label: "Developer",
    audience: "Software · data · engineering",
    description: "Tech stack up front, projects with stack and links, monospaced accents.",
    font: "Inter, ui-sans-serif, sans-serif",
    pdfFont: "helvetica",
    accent: "#005BB3",
    headingStyle: "accent",
    headerAlign: "left",
    skillsStyle: "chips",
    order: ["summary", "skills", "projects", "experience", "education"],
    titles: { summary: "About", skills: "Tech Stack", projects: "Projects", experience: "Experience", education: "Education" },
  },
  business: {
    id: "business",
    label: "Business",
    audience: "Management · sales · marketing · ops",
    description: "Centred executive header, core competencies grid and achievement-focused experience.",
    font: "Georgia, 'Times New Roman', serif",
    pdfFont: "times",
    accent: "#1e3a5f",
    headingStyle: "rule",
    headerAlign: "center",
    skillsStyle: "grid",
    order: ["summary", "skills", "experience", "education", "projects"],
    titles: { summary: "Executive Profile", skills: "Core Competencies", experience: "Career Highlights", education: "Education", projects: "Key Initiatives" },
  },
};

// List form (for the picker UI) and a lookup that falls back to "professional" for unknown ids.
export const TEMPLATE_LIST = Object.values(TEMPLATES);
export const getTemplate = (id) => TEMPLATES[id] || TEMPLATES.professional;

// Normalises whatever is stored so every template can rely on the same shape.
// Missing fields become empty strings/arrays, and blank entries are filtered out.
// Normalises whatever is stored so every template can rely on the same shape.
export function normalizeResume(d = {}) {
  const p = d.personal || {};
  return {
    personal: {
      fullName: p.fullName || "", email: p.email || "", phone: p.phone || "",
      location: p.location || "", linkedin: p.linkedin || "", website: p.website || "",
    },
    summary: d.summary || "",
    experience: (d.experience || []).filter((e) => e.role || e.company || (e.bullets || []).length),
    education: (d.education || []).filter((e) => e.degree || e.school),
    projects: (d.projects || []).filter((x) => x.name || x.description),
    skills: d.skills || [],
  };
}

// Contact details that exist, in order, ready to be joined with a separator.
export const contactLine = (p) => [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);
// Formats a date range like "2021 - 2023", skipping empty parts.
export const dates = (a, b) => [a, b].filter(Boolean).join(" - ");
