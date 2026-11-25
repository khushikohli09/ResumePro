// Helpers for turning resumes into text and into structured data (profile): date range parsing,
// section splitting and builder-form conversion. Used by several tools.
const { extractSkills } = require("./roleCatalog");

// Month name (first 3 letters) -> month number 0-11.
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// Regex source for a month name, e.g. "jan", "sept", "January", with an optional dot.
const MON = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
// Regex source for a date range like "2019 - 2022" or "Jan 2020 to Present".
// Groups: 1 start month (optional), 2 start year, 3 end month (optional), 4 end year or present/current/now/ongoing.
// Years are limited to 1900-2099; the separator can be -, an en/em dash or "to".
const RANGE_SRC = `(?:(${MON})\\s+)?((?:19|20)\\d{2})\\s*(?:-|–|—|to)\\s*(?:(${MON})\\s+)?((?:19|20)\\d{2}|present|current|now|ongoing)`;
// Words suggesting a line belongs to education (degree, university, GPA...).
const EDU_WORDS = /university|college|school|institute|b\.?\s?tech|b\.?\s?e\b|bachelor|master|m\.?\s?tech|diploma|b\.?\s?sc|m\.?\s?sc|\bmba\b|degree|cgpa|gpa/i;
// Matches the start of a bullet line: optional spaces, a bullet symbol, then whitespace.
const BULLET = /^\s*[-•*▪●◦‣–·]\s+/;

// Converts the resume builder's structured data into plain text with SUMMARY/EXPERIENCE/... headings,
// so the same text analysers can be used on builder resumes.
function builderToText(d = {}) {
  const p = d.personal || {};
  const out = [];
  if (p.fullName) out.push(p.fullName);
  const contact = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join(" | ");
  if (contact) out.push(contact);
  if (d.summary) out.push("", "SUMMARY", d.summary);
  if ((d.experience || []).length) {
    out.push("", "EXPERIENCE");
    d.experience.forEach((e) => {
      out.push(`${e.role || ""}${e.company ? ", " + e.company : ""} ${[e.startDate, e.endDate].filter(Boolean).join(" - ")}`.trim());
      (e.bullets || []).forEach((b) => out.push(`- ${b}`));
    });
  }
  if ((d.projects || []).length) {
    out.push("", "PROJECTS");
    d.projects.forEach((p2) => {
      out.push(`${p2.name || ""}${p2.tech ? " (" + p2.tech + ")" : ""}`);
      if (p2.description) out.push(`- ${p2.description}`);
    });
  }
  if ((d.education || []).length) {
    out.push("", "EDUCATION");
    d.education.forEach((e) =>
      out.push(`${e.degree || ""}${e.school ? ", " + e.school : ""} ${[e.startDate, e.endDate].filter(Boolean).join(" - ")}${e.grade ? " | " + e.grade : ""}`.trim())
    );
  }
  if ((d.skills || []).length) out.push("", "SKILLS", d.skills.join(", "));
  return out.join("\n");
}

// Returns the resume's text: the uploaded raw text if present, otherwise text built from the builder data.
function resumeToText(resume) {
  return resume.rawText && resume.rawText.trim() ? resume.rawText : builderToText(resume.builderData || {});
}

// Current month as a single number: year*12 + month. Dates are compared this way throughout.
const nowIndex = () => {
  const n = new Date();
  return n.getFullYear() * 12 + n.getMonth();
};

// Finds "2019 - 2022", "Jan 2020 – Present" style ranges and tags each as
// education or work based on the surrounding lines.
function parseRanges(text = "") {
  const lines = text.split(/\r?\n/);
  const ranges = [];
  lines.forEach((line, i) => {
    const re = new RegExp(RANGE_SRC, "gi");
    let m;
    while ((m = re.exec(line))) {
      // Missing start month defaults to January (0).
      const sm = m[1] ? MONTHS[m[1].slice(0, 3).toLowerCase()] : 0;
      const startYear = parseInt(m[2], 10);
      const endRaw = m[4].toLowerCase();
      // "Present"-style end values mean the range runs up to today.
      const ongoing = /^(present|current|now|ongoing)$/.test(endRaw);
      const endYear = ongoing ? new Date().getFullYear() : parseInt(endRaw, 10);
      // End month: current month if ongoing, the given month if any, otherwise December (11).
      const em = ongoing ? new Date().getMonth() : m[3] ? MONTHS[m[3].slice(0, 3).toLowerCase()] : 11;
      // Context = this line plus the two lines before it, used to decide whether it is education or work.
      const ctx = [lines[i - 2], lines[i - 1], line].filter(Boolean).join(" ");
      ranges.push({
        line: i + 1,
        raw: m[0],
        text: line.trim(),
        startYear,
        endYear,
        // start/end are stored as month indexes (year*12 + month).
        start: startYear * 12 + sm,
        end: endYear * 12 + em,
        ongoing,
        kind: EDU_WORDS.test(ctx) ? "education" : "work",
      });
    }
  });
  return ranges;
}

// Adds up the total months covered by a list of ranges without double counting overlaps:
// sort by start, merge overlapping ranges, then sum each merged block's length.
function mergedMonths(ranges) {
  const sorted = ranges.filter((r) => r.end >= r.start).sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = null;
  let curEnd = null;
  for (const r of sorted) {
    if (curStart === null) { curStart = r.start; curEnd = r.end; continue; }
    if (r.start <= curEnd) curEnd = Math.max(curEnd, r.end);
    else { total += curEnd - curStart; curStart = r.start; curEnd = r.end; }
  }
  if (curStart !== null) total += curEnd - curStart;
  return total;
}

// Patterns recognising section heading lines (e.g. "Work Experience", "Education").
const HEADERS = {
  summary: /^(professional\s+)?(summary|objective|career objective|profile|about( me)?)\s*:?$/i,
  experience: /^(work\s+|professional\s+)?(experience|employment( history)?|internships?(\s*&\s*experience)?)\s*:?$/i,
  education: /^education(al background)?\s*:?$/i,
  projects: /^(personal\s+|academic\s+)?projects?\s*:?$/i,
  skills: /^(technical\s+|core\s+)?(skills|competencies|technologies)(\s*&\s*tools)?\s*:?$/i,
  other: /^(certifications?|achievements?|awards?|languages|interests|publications|extracurricular.*)\s*:?$/i,
};

// Splits resume text into sections keyed by heading (summary, experience, education, ...).
// Lines before the first heading go in "header". Only short lines (under 40 chars) count as headings.
function splitSections(text = "") {
  const sections = { header: [] };
  let current = "header";
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    const key = Object.keys(HEADERS).find((k) => line.length < 40 && HEADERS[k].test(line));
    if (key) { current = key === "other" ? "other" : key; sections[current] = sections[current] || []; return; }
    (sections[current] = sections[current] || []).push(raw);
  });
  return sections;
}

// Best-effort structured profile with no LLM involved.
function heuristicProfile(text = "") {
  const sections = splitSections(text);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || "";
  const phone = (text.match(/(\+?\d[\d\s\-().]{8,}\d)/) || [])[0] || "";
  const first = lines[0] || "";
  // Guess the name: the first line, if it's at most 5 words and has no digits or "@".
  const name = first.split(/\s+/).length <= 5 && !/[@\d]/.test(first) ? first : "";
  const linkedin = (text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,)]+/i) || [])[0] || "";
  const github = (text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)]+/i) || [])[0] || "";

  const ranges = parseRanges(text);
  const workMonths = mergedMonths(ranges.filter((r) => r.kind === "work"));

  // (Below) experience entries: a line with a date range starts an entry, bullets follow.
  // experience entries: a line with a date range starts an entry, bullets follow
  const experience = [];
  (sections.experience || []).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const re = new RegExp(RANGE_SRC, "i");
    const m = line.match(re);
    if (m) {
      // Remove the date range and trailing separators, leaving something like "Role, Company".
      const head = line.replace(re, "").replace(/[|,()–—-]+\s*$/g, "").trim();
      // Split role from company on a comma, " at ", "|", "-" or "@".
      const [role, ...rest] = head.split(/\s*(?:,| at | \| | - | @ )\s*/);
      experience.push({ role: role || head, company: rest.join(", "), period: m[0], bullets: [] });
    // A bullet or a long line (over 6 words) after an entry is treated as one of its bullets.
    } else if (experience.length && (BULLET.test(raw) || line.split(/\s+/).length > 6)) {
      experience[experience.length - 1].bullets.push(line.replace(BULLET, ""));
    } else if (!experience.length || (!BULLET.test(raw) && line.split(/\s+/).length <= 6)) {
      experience.push({ role: line, company: "", period: "", bullets: [] });
    }
  });

  // Projects: a non-bullet line starts a project (name before a separator such as : or a dash); bullet lines add to its description.
  const projects = [];
  (sections.projects || []).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    if (BULLET.test(raw) && projects.length) {
      const p = projects[projects.length - 1];
      p.description = (p.description ? p.description + " " : "") + line.replace(BULLET, "");
    } else {
      const [name, ...rest] = line.split(/\s*[:—–|]\s*|\s+-\s+/);
      projects.push({ name: name.slice(0, 80), description: rest.join(" — "), link: "" });
    }
  });

  // Education: keep lines containing education words; split the date range out of the degree text.
  const education = (sections.education || [])
    .map((l) => l.trim())
    .filter((l) => l && EDU_WORDS.test(l))
    .map((l) => ({ degree: l.replace(new RegExp(RANGE_SRC, "i"), "").trim(), school: "", period: (l.match(new RegExp(RANGE_SRC, "i")) || [""])[0] }));

  return {
    name,
    email,
    phone: phone.trim(),
    location: "",
    links: [linkedin && { label: "LinkedIn", url: linkedin }, github && { label: "GitHub", url: github }].filter(Boolean),
    skills: extractSkills(text),
    // Years of experience = merged work months / 12, rounded to one decimal.
    yearsExperience: Math.round((workMonths / 12) * 10) / 10,
    summary: (sections.summary || []).join(" ").trim(),
    experience: experience.filter((e) => e.role).slice(0, 8),
    projects: projects.filter((p) => p.name).slice(0, 8),
    education: education.slice(0, 4),
  };
}

// Map builder form data into the same shape as heuristicProfile.
function builderToProfile(d = {}) {
  const p = d.personal || {};
  return {
    name: p.fullName || "",
    email: p.email || "",
    phone: p.phone || "",
    location: p.location || "",
    links: [p.linkedin && { label: "LinkedIn", url: p.linkedin }, p.website && { label: "Website", url: p.website }].filter(Boolean),
    skills: d.skills || [],
    yearsExperience: Math.round((mergedMonths(parseRanges(builderToText(d)).filter((r) => r.kind === "work")) / 12) * 10) / 10,
    summary: d.summary || "",
    headline: d.targetRole || "",
    experience: (d.experience || []).map((e) => ({ role: e.role, company: e.company, period: [e.startDate, e.endDate].filter(Boolean).join(" – "), bullets: e.bullets || [] })),
    projects: (d.projects || []).map((x) => ({ name: x.name, description: x.description, link: x.link, tech: x.tech })),
    education: (d.education || []).map((e) => ({ degree: e.degree, school: e.school, period: [e.startDate, e.endDate].filter(Boolean).join(" – "), grade: e.grade })),
  };
}

module.exports = { builderToText, resumeToText, parseRanges, mergedMonths, splitSections, heuristicProfile, builderToProfile, nowIndex, BULLET };
