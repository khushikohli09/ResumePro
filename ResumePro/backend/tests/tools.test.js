// End-to-end smoke test for the AI tools API. It stubs MongoDB model lookups and
// the LLM HTTP call, so it needs neither a database nor an API key.
process.env.JWT_SECRET = "test-secret";
process.env.LLM_PROVIDER = "anthropic";
process.env.ANTHROPIC_API_KEY = "test";

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Resume = require("../models/Resume");
const app = require("../app");

const realFetch = global.fetch;
let llmMode = "down";

const RESUME_TEXT = `Monica Gupta
monica@example.com | +91 98765 43210 | github.com/monica

SUMMARY
Full stack developer who is responsible for building web apps.

EXPERIENCE
Software Intern, Acme Corp  Jun 2023 - Aug 2023
- Worked on a API for the the payments team
- Built REST APIs with Node.js and Express reducing latency by 30%
- Developed dashboards in React used by 500 users
- Developed alerts with MongoDB and Docker
- Developed a login flow with JWT

PROJECTS
ResumeAI: AI resume analyzer
- MERN app with LLM scoring and PDF export

EDUCATION
B.E. Computer Science, Chitkara University 2023 - 2027

SKILLS
JavaScript, React, Node.js, Express, MongoDB, SQL, Docker, Git`;

const fakeResumes = {
  "64b000000000000000000001": { _id: "64b000000000000000000001", user: "u1", source: "uploaded", rawText: RESUME_TEXT },
  "64b000000000000000000002": {
    _id: "64b000000000000000000002", user: "u1", source: "builder", rawText: "",
    builderData: {
      personal: { fullName: "Ravi Kumar", email: "ravi@example.com", phone: "999", location: "Pune", linkedin: "linkedin.com/in/ravi" },
      summary: "Backend developer.", targetRole: "Backend Developer",
      experience: [{ id: "a", role: "Backend Developer", company: "Zeta", startDate: "Jan 2021", endDate: "Present", bullets: ["Built Node.js services with MongoDB handling 2M requests/day"] }],
      education: [{ id: "b", degree: "B.Tech CSE", school: "NIT", startDate: "2017", endDate: "2021", grade: "8.5 CGPA" }],
      projects: [{ id: "c", name: "Chatly", description: "Realtime chat with websockets", link: "https://github.com/ravi/chatly", tech: "Node.js, Redis" }],
      skills: ["Node.js", "MongoDB", "Redis", "Docker"], template: "developer",
    },
  },
};

User.findById = async (id) => (id === "u1" ? { _id: "u1", name: "T", email: "t@t.com", theme: "light" } : null);
Resume.findOne = async (q) => (fakeResumes[q._id] && String(fakeResumes[q._id].user) === String(q.user) ? fakeResumes[q._id] : null);

const CANNED = {
  proofreader: { issues: [{ type: "weak-verb", severity: "medium", text: "Developed dashboards in React used by 500 users", message: "AI: could show impact more clearly", suggestion: "Built React dashboards used by 500 users, cutting report time by 40%" }] },
  "credibility check": { concerns: [{ severity: "low", title: "Intern scope unclear", detail: "Impact claims for a 3-month internship", fix: "State what you personally owned", evidence: "reducing latency by 30%" }] },
  "LinkedIn profile strategist": { headlines: ["Full Stack Developer | React · Node.js · MongoDB", "MERN developer shipping AI products", "Computer Science student building with LLMs", "React + Node engineer", "Builder of ResumeAI"], about: "I build web apps.\n\nI shipped ResumeAI.\n\nLet's connect.", experience: [{ role: "Software Intern", company: "Acme Corp", description: "• Built REST APIs with Node.js" }], skillsToAdd: ["TypeScript"], tips: ["Add a banner"] },
  "career counselor": { roles: [{ role: "Full Stack Developer", matchScore: 78, level: "Entry", why: ["MERN project", "React + Node internship"], matchedSkills: ["react", "node.js"], missingSkills: ["typescript"], nextStep: "Add TypeScript" }, { role: "Backend Developer", matchScore: 70, level: "Entry", why: ["REST APIs"], matchedSkills: ["node.js"], missingSkills: ["redis"], nextStep: "Learn Redis" }] },
  "learning roadmaps": { summary: "You cover the core stack.", roadmap: [{ phase: 1, title: "TypeScript foundations", weeks: 3, goals: ["Type a real project"], topics: ["typescript"], project: "Port ResumeAI backend to TS", resources: ["Official TypeScript handbook"] }], tips: ["Ship weekly"] },
  "portfolio website": { name: "Monica Gupta", headline: "Full stack developer building AI-powered web apps", about: "I build MERN apps with LLM features.", email: "monica@example.com", skills: ["React", "Node.js"], experience: [{ role: "Software Intern", company: "Acme Corp", period: "Jun 2023 - Aug 2023", bullets: ["Built REST APIs"] }], projects: [{ name: "ResumeAI", description: "AI resume analyzer", link: "https://github.com/monica/resumeai", tech: "MERN" }], education: [{ degree: "B.E. Computer Science", school: "Chitkara University", period: "2023 - 2027" }] },
};

global.fetch = async (url, init) => {
  if (!String(url).includes("api.anthropic.com")) return realFetch(url, init);
  if (llmMode === "down") throw new Error("network down (simulated)");
  const system = JSON.parse(init.body).system;
  const key = Object.keys(CANNED).find((k) => system.includes(k));
  const body = { content: [{ type: "text", text: "```json\n" + JSON.stringify(CANNED[key]) + "\n```" }] };
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
};

const token = jwt.sign({ id: "u1" }, process.env.JWT_SECRET);
let base;
const call = async (path, body, auth = true, method = "POST") => {
  const r = await realFetch(base + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: method === "POST" ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
};

let passed = 0;
const check = (name, fn) => { try { fn(); passed++; console.log("  ✓", name); } catch (e) { console.log("  ✗", name, "\n     ", e.message); process.exitCode = 1; } };

(async () => {
  const server = http.createServer(app).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/tools`;
  const R1 = "64b000000000000000000001";
  const R2 = "64b000000000000000000002";

  console.log("\nGuards");
  let r = await call("/grammar", { resumeId: R1 }, false);
  check("401 without token", () => assert.strictEqual(r.status, 401));
  r = await call("/grammar", { resumeId: "nope" });
  check("400 on invalid resume id", () => assert.strictEqual(r.status, 400));
  r = await call("/grammar", { text: "too short" });
  check("400 on too-short text", () => assert.strictEqual(r.status, 400));
  r = await call("/grammar", { resumeId: "64b0000000000000000000ff" });
  check("404 on unknown resume", () => assert.strictEqual(r.status, 404));

  for (const mode of ["down", "up"]) {
    llmMode = mode;
    console.log(`\nLLM ${mode.toUpperCase()} (${mode === "down" ? "deterministic fallbacks" : "LLM results merged"})`);

    r = await call("/grammar", { resumeId: R1 });
    check("grammar: finds duplicate word, weak verb, repetition", () => {
      assert.strictEqual(r.status, 200);
      const msgs = r.data.issues.map((i) => i.message).join(" | ");
      assert.ok(/the the/.test(msgs), "duplicate word");
      assert.ok(r.data.issues.some((i) => i.type === "weak-verb"), "weak verb");
      assert.ok(r.data.issues.some((i) => i.type === "repetition"), "repetition");
      assert.ok(r.data.issues.some((i) => i.type === "vague" || i.type === "grammar"));
      assert.strictEqual(r.data.aiUsed, mode === "up");
      if (mode === "up") assert.ok(r.data.issues.some((i) => i.source === "ai"));
    });

    r = await call("/authenticity", { text: RESUME_TEXT });
    check("authenticity: returns score, verdict and flags", () => {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.score >= 0 && r.data.score <= 100);
      assert.ok(r.data.verdict && Array.isArray(r.data.flags) && r.data.disclaimer);
      if (mode === "up") assert.ok(r.data.flags.some((f) => f.source === "ai"));
    });

    r = await call("/linkedin", { resumeId: R1, targetRole: "Full Stack Developer" });
    check("linkedin: headlines, about, experience, tips", () => {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.headlines.length >= 3 && r.data.about.length > 30);
      assert.ok(r.data.experience.length >= 1 && r.data.tips.length >= 1);
      assert.strictEqual(r.data.aiUsed, mode === "up");
    });

    r = await call("/jobs", { resumeId: R1 });
    check("jobs: ranked roles + detected profile", () => {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.roles.length >= 2);
      const scores = r.data.roles.map((x) => x.matchScore);
      assert.deepStrictEqual(scores, [...scores].sort((a, b) => b - a));
      assert.ok(r.data.profile.skills.includes("react"));
      if (mode === "down") assert.ok(/Full Stack|Backend|Frontend/.test(r.data.roles[0].role));
    });

    r = await call("/roadmap", { resumeId: R1, targetRole: "DevOps Engineer", hoursPerWeek: 8 });
    check("roadmap: gaps, readiness, phased plan", () => {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.missingSkills.length > 0 && r.data.missingSkills[0].priority === "high");
      assert.ok(r.data.roadmap.length >= 1 && r.data.totalWeeks > 0);
      assert.ok(r.data.readiness >= 0 && r.data.readiness < 100);
      assert.ok(r.data.matchedSkills.includes("docker"));
    });
    r = await call("/roadmap", { resumeId: R1, jobDescription: "We need Kubernetes, Terraform, AWS and CI/CD experience" });
    check("roadmap: works from a pasted job description", () => {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.missingSkills.map((m) => m.skill).includes("kubernetes"));
    });
    r = await call("/roadmap", { resumeId: R1, targetRole: "Astronaut" });
    check("roadmap: 400 when no target skills can be determined", () => assert.strictEqual(r.status, 400));

    r = await call("/portfolio", { resumeId: R1, theme: "dark", accent: "#2e7d5b" });
    check("portfolio: generates a complete HTML page", () => {
      assert.strictEqual(r.status, 200);
      assert.ok(r.data.html.startsWith("<!doctype html>") && r.data.html.includes("Monica"));
      assert.ok(r.data.html.includes("#2e7d5b") && r.data.html.includes('data-theme="dark"'));
      assert.ok(r.data.profile.skills.length > 0);
    });
  }

  console.log("\nBuilder-created resume + portfolio re-render");
  llmMode = "down";
  r = await call("/portfolio", { resumeId: R2 });
  check("portfolio from builder data (no LLM)", () => {
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.profile.name, "Ravi Kumar");
    assert.ok(r.data.profile.links.some((l) => l.label === "LinkedIn"));
    assert.ok(r.data.html.includes("Chatly"));
  });
  const edited = { ...r.data.profile, name: "Ravi <b>K</b>", headline: "Edited headline" };
  r = await call("/portfolio", { profile: edited, theme: "light" });
  check("portfolio re-render with edited profile escapes HTML + switches theme", () => {
    assert.ok(r.data.html.includes("Edited headline") && r.data.html.includes('data-theme="light"'));
    assert.ok(!r.data.html.includes("<b>K</b>"));
  });
  r = await call("/grammar", { resumeId: R2 });
  check("tools run on builder resumes too", () => assert.strictEqual(r.status, 200));
  r = await call("/roles", null, true, "GET");
  check("GET /roles lists catalogue", () => assert.ok(r.data.roles.includes("Data Scientist")));

  server.close();
  console.log(`\n${passed} checks passed${process.exitCode ? " (with failures)" : ""}`);
  process.exit(process.exitCode ? 1 : 0);
})();

