// Renders a self-contained, single-file portfolio website from a profile.
// Every user-supplied string is HTML-escaped and every URL is validated, so the
// generated page is safe to host or open locally.

// Escapes HTML special characters so user text can't inject markup (XSS protection).
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Returns a safe URL or "": allows mailto: links and http(s) links; a bare domain like "example.com" gets https:// added;
// anything else (e.g. javascript:) is rejected.
function safeUrl(u = "") {
  const url = String(u).trim();
  if (!url) return "";
  if (/^mailto:/i.test(url)) return url;
  const withProto = /^https?:\/\//i.test(url) ? url : /^[\w.-]+\.[a-z]{2,}/i.test(url) ? `https://${url}` : "";
  return withProto;
}

// str: trimmed string cut to max length (or "" if not a string). arr: array cut to max items (or [] if not an array).
const str = (v, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const arr = (v, max = 12) => (Array.isArray(v) ? v.slice(0, max) : []);

// Coerce anything (LLM output, client-edited JSON) into the shape the template expects.
// Cleans a profile object: limits lengths and counts, drops empty/invalid entries and links with unsafe URLs.
function normalizeProfile(p = {}) {
  return {
    name: str(p.name, 80) || "Your Name",
    headline: str(p.headline, 140),
    about: str(p.about || p.summary, 1200),
    email: str(p.email, 120),
    phone: str(p.phone, 40),
    location: str(p.location, 80),
    links: arr(p.links, 6).map((l) => ({ label: str(l?.label, 30) || "Link", url: str(l?.url, 200) })).filter((l) => safeUrl(l.url)),
    skills: arr(p.skills, 30).map((s) => str(s, 40)).filter(Boolean),
    experience: arr(p.experience, 8).map((e) => ({
      role: str(e?.role, 100), company: str(e?.company, 100), period: str(e?.period, 50),
      bullets: arr(e?.bullets, 6).map((b) => str(b, 300)).filter(Boolean),
    })).filter((e) => e.role || e.company),
    projects: arr(p.projects, 8).map((x) => ({
      name: str(x?.name, 100), description: str(x?.description, 400), link: str(x?.link, 200), tech: str(x?.tech, 120),
    })).filter((x) => x.name),
    education: arr(p.education, 4).map((e) => ({ degree: str(e?.degree, 140), school: str(e?.school, 120), period: str(e?.period, 50) })).filter((e) => e.degree || e.school),
  };
}

// Builds the full HTML page as a string. Inputs: a profile, options theme (light/dark) and accent colour.
// Output: complete HTML text.
function renderPortfolio(input, { theme = "dark", accent = "#005BB3" } = {}) {
  const p = normalizeProfile(input);
  // Only accept a 6-digit hex colour for the accent; otherwise use the default (prevents CSS injection).
  const color = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#005BB3";
  const mode = ["light", "dark"].includes(theme) ? theme : "dark";
  // Initials for the logo circle: first letter of up to the first two words.
  const initials = p.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const contactLinks = [
    p.email && { label: "Email", url: `mailto:${p.email}` },
    ...p.links,
  ].filter(Boolean);

  // Wraps a section's content in a titled <section>; returns "" when there is no content so empty sections are omitted.
  const section = (id, title, body) => (body ? `<section id="${id}"><h2>${esc(title)}</h2>${body}</section>` : "");

  // The next few constants build the HTML for each section. Every value is passed through esc().
  const experience = p.experience.map((e) => `
    <article class="item">
      <div class="row"><h3>${esc(e.role)}${e.company ? ` <span class="muted">· ${esc(e.company)}</span>` : ""}</h3><span class="mono muted">${esc(e.period)}</span></div>
      ${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
    </article>`).join("");

  const projects = p.projects.map((x) => {
    const href = safeUrl(x.link);
    return `<article class="card">
      <h3>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a>` : esc(x.name)}</h3>
      ${x.description ? `<p>${esc(x.description)}</p>` : ""}
      ${x.tech ? `<p class="mono muted small">${esc(x.tech)}</p>` : ""}
    </article>`;
  }).join("");

  const education = p.education.map((e) => `
    <article class="item"><div class="row"><h3>${esc(e.degree)}${e.school ? ` <span class="muted">· ${esc(e.school)}</span>` : ""}</h3><span class="mono muted">${esc(e.period)}</span></div></article>`).join("");

  const skills = p.skills.length ? `<div class="chips">${p.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : "";
  const contact = contactLinks.length
    ? `<div class="chips">${contactLinks.map((l) => `<a class="btn" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join("")}</div>
       ${[p.phone, p.location].filter(Boolean).length ? `<p class="muted mono small">${esc([p.phone, p.location].filter(Boolean).join(" · "))}</p>` : ""}`
    : "";

  // Navigation links only for sections that have content.
  const nav = [["about", p.about], ["skills", skills], ["experience", experience], ["projects", projects], ["education", education], ["contact", contact]]
    .filter(([, v]) => v).map(([id]) => `<a href="#${id}">${id[0].toUpperCase() + id.slice(1)}</a>`).join("");

  // The page template. The style and script inside it are plain CSS/JavaScript shipped with the page.
  return `<!doctype html>
<html lang="en" data-theme="${mode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.name)}${p.headline ? " – " + esc(p.headline) : ""}</title>
<meta name="description" content="${esc(p.headline || p.about.slice(0, 150))}">
<style>
:root{--bg:#f5f6f3;--surface:#fff;--ink:#16191a;--muted:#667069;--line:#dde1da;--accent:${color}}
[data-theme="dark"]{--bg:#0f1110;--surface:#171a18;--ink:#eceee8;--muted:#8f978d;--line:#272b27}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.muted{color:var(--muted)}.small{font-size:.82rem}
header.bar{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.bar .in{max-width:960px;margin:0 auto;padding:.8rem 1.25rem;display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap}
.logo{width:34px;height:34px;border:2px dashed var(--accent);border-radius:50%;display:grid;place-items:center;font:600 .78rem ui-monospace,monospace;color:var(--accent);transform:rotate(-6deg)}
nav{display:flex;gap:1.1rem;flex:1;flex-wrap:wrap}nav a{text-decoration:none;color:var(--muted);font-size:.9rem}nav a:hover{color:var(--accent)}
#t{border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:.3rem .8rem;cursor:pointer;font-size:.8rem}#t:hover{border-color:var(--accent);color:var(--accent)}
main{max-width:960px;margin:0 auto;padding:0 1.25rem}
.hero{padding:5rem 0 3rem}.hero .eyebrow{color:var(--accent);font:600 .75rem ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}
.hero h1{font-size:clamp(2.2rem,6vw,3.6rem);line-height:1.08;margin:.6rem 0 .8rem;letter-spacing:-.02em}.hero p{max-width:620px;color:var(--muted);font-size:1.1rem;margin:0}
section{padding:2.5rem 0;border-top:1px solid var(--line)}
h2{font:600 .78rem ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0 0 1.2rem}
h3{font-size:1.02rem;margin:0}.row{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline}
.item{margin-bottom:1.6rem}.item ul{margin:.5rem 0 0;padding-left:1.1rem;color:var(--muted)}.item li{margin:.25rem 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:1rem}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1.2rem}.card:hover{border-color:var(--accent)}.card p{margin:.5rem 0 0;color:var(--muted);font-size:.95rem}
.chips{display:flex;flex-wrap:wrap;gap:.5rem}.chip{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:.25rem .8rem;font:500 .8rem ui-monospace,monospace}
.btn{background:var(--accent);color:#fff;text-decoration:none;border-radius:999px;padding:.5rem 1.1rem;font-size:.9rem;font-weight:600}.btn:hover{opacity:.88}
footer{max-width:960px;margin:0 auto;padding:2rem 1.25rem 3rem;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line)}
@media print{header.bar{display:none}}
</style>
</head>
<body>
<header class="bar"><div class="in"><div class="logo">${esc(initials)}</div><nav>${nav}</nav><button id="t" type="button" aria-label="Toggle theme">Theme</button></div></header>
<main>
<div class="hero"><div class="eyebrow">${esc(p.location || "Portfolio")}</div><h1>${esc(p.name)}</h1>${p.headline ? `<p>${esc(p.headline)}</p>` : ""}${contactLinks.length ? `<div class="chips" style="margin-top:1.5rem">${contactLinks.slice(0, 3).map((l) => `<a class="btn" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join("")}</div>` : ""}</div>
${section("about", "About", p.about ? `<p>${esc(p.about)}</p>` : "")}
${section("skills", "Skills", skills)}
${section("experience", "Experience", experience)}
${section("projects", "Projects", projects ? `<div class="grid">${projects}</div>` : "")}
${section("education", "Education", education)}
${section("contact", "Contact", contact)}
</main>
<footer>© ${new Date().getFullYear()} ${esc(p.name)} · Generated with ResumePro</footer>
<script>
(function(){var r=document.documentElement,k="portfolio-theme";try{var s=localStorage.getItem(k);if(s)r.setAttribute("data-theme",s)}catch(e){}
document.getElementById("t").addEventListener("click",function(){var n=r.getAttribute("data-theme")==="dark"?"light":"dark";r.setAttribute("data-theme",n);try{localStorage.setItem(k,n)}catch(e){}})})();
</script>
</body>
</html>`;
}

module.exports = { renderPortfolio, normalizeProfile, safeUrl };
