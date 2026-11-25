// Controllers for the extra career tools: grammar check, authenticity check, LinkedIn suggestions,
// job recommendations, skill roadmap and portfolio generator, plus the role list.
// Pattern used by every tool: run rule-based logic first, then optionally ask the AI to improve it.
// If the AI is unavailable, the rule-based result is still returned (aiUsed tells the client which happened).
const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const { askLLM } = require("../utils/llm");
const { resumeToText, heuristicProfile, builderToProfile } = require("../utils/resumeText");
const { checkGrammar, finalize, dedupe } = require("../utils/grammar");
const { checkAuthenticity } = require("../utils/authenticity");
const { renderPortfolio, normalizeProfile } = require("../utils/portfolio");
const { ROLES, extractSkills, matchRoles, findRole, fallbackRoadmap } = require("../utils/roleCatalog");

// Creates an Error carrying an HTTP status code so wrap() can send the right response.
const httpError = (status, message) => Object.assign(new Error(message), { status });
// Wraps an async route handler so any thrown error becomes a JSON error response (no try/catch in each tool).
// Errors made with httpError show their message; unexpected errors show a generic message plus details.
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("[tools]", err.message);
    res.status(err.status || 500).json({ message: err.status ? err.message : "Something went wrong", error: err.status ? undefined : err.message });
  }
};

// Every tool accepts either { resumeId } (a saved resume) or { text } (pasted).
// Returns { text, resume? }; throws 400/404/422 errors when the input is missing, invalid or too short (under 50 chars).
// Every tool accepts either { resumeId } (a saved resume) or { text } (pasted).
async function loadInput(req) {
  const { resumeId, text } = req.body || {};
  if (resumeId) {
    // Check the id format first so a malformed id gives 400 instead of a database error.
    if (!mongoose.isValidObjectId(resumeId)) throw httpError(400, "Invalid resume id");
    // Only load resumes owned by the logged-in user.
    const resume = await Resume.findOne({ _id: resumeId, user: req.user._id });
    if (!resume) throw httpError(404, "Resume not found");
    const t = resumeToText(resume);
    if (t.trim().length < 50) throw httpError(422, "That resume has too little text to analyse");
    return { text: t, resume };
  }
  if (typeof text === "string" && text.trim().length >= 50) return { text };
  throw httpError(400, "Choose a saved resume or paste at least a few lines of resume text");
}

// Calls the AI but returns null instead of throwing if it fails, so callers can use their fallback.
// LLM calls are always optional: every tool has a deterministic fallback.
async function tryLLM(system, user, opts) {
  try {
    return await askLLM(system, user, opts);
  } catch (err) {
    console.error("[tools] LLM unavailable:", err.message.slice(0, 200));
    return null;
  }
}

// cap: limits text length (default 9000 chars) to keep AI prompts small. title: capitalises the first letter of each word.
const cap = (t, n = 9000) => t.slice(0, n);
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Grammar tool
/* ------------------------------ grammar ------------------------------ */
const GRAMMAR_SYS = `You are a meticulous resume proofreader. Find real writing problems only: grammatical errors, weak or passive verbs, repetition, and vague or unquantified statements. Do not invent problems.
Respond with STRICT JSON ONLY:
{"issues":[{"type":"grammar|weak-verb|repetition|vague|style","severity":"high|medium|low","text":"exact excerpt copied from the resume (max 140 chars)","message":"what is wrong","suggestion":"a concrete rewritten version"}]}
Return at most 15 of the most valuable issues.`;

// POST /api/tools/grammar { resumeId | text }: rule-based checks plus optional AI-found issues, merged and de-duplicated.
const grammarCheck = wrap(async (req, res) => {
  const { text } = await loadInput(req);
  const rules = checkGrammar(text);
  rules.issues.forEach((i) => (i.source = "rules"));

  const ai = await tryLLM(GRAMMAR_SYS, cap(text));
  let issues = rules.issues;
  if (ai && Array.isArray(ai.issues)) {
    // Find the line number of an AI issue by looking for the first 40 chars of its excerpt in the resume (0 = not found).
    const lines = text.split(/\r?\n/);
    const types = ["grammar", "weak-verb", "repetition", "vague", "style"];
    // Only accept the issue types we know about; anything else becomes "style" (same idea for severity below).
    const extra = ai.issues.slice(0, 15).filter((i) => i && i.message).map((i) => {
      const excerpt = String(i.text || "").slice(0, 140);
      const line = excerpt ? lines.findIndex((l) => l.includes(excerpt.slice(0, 40))) + 1 : 0;
      return {
        type: types.includes(i.type) ? i.type : "style",
        severity: ["high", "medium", "low"].includes(i.severity) ? i.severity : "medium",
        line, text: excerpt, message: String(i.message), suggestion: String(i.suggestion || ""), source: "ai",
      };
    });
    issues = dedupe([...rules.issues, ...extra]);
  }
  const result = finalize(issues);
  res.json({ ...result, aiUsed: !!ai });
});

// Authenticity tool
/* ---------------------------- authenticity ---------------------------- */
const AUTH_SYS = `You review resumes the way a careful recruiter does a credibility check. Flag only genuine inconsistencies, implausible claims, or claims with no supporting evidence in the resume. Never accuse the candidate of fraud; phrase concerns as things to verify or clarify.
Respond with STRICT JSON ONLY:
{"concerns":[{"severity":"high|medium|low","title":"short title","detail":"why a recruiter might question it","fix":"how the candidate can make it verifiable","evidence":"short excerpt from the resume"}]}
Return at most 6 concerns, or an empty list if nothing stands out.`;

// POST /api/tools/authenticity { resumeId | text, jobDescription? }: rule-based credibility flags plus optional AI concerns.
const authenticityCheck = wrap(async (req, res) => {
  const { text } = await loadInput(req);
  const jobDescription = typeof req.body.jobDescription === "string" ? req.body.jobDescription : "";
  const result = checkAuthenticity(text, { jobDescription });

  const ai = await tryLLM(AUTH_SYS, cap(text));
  if (ai && Array.isArray(ai.concerns)) {
    // Skip AI concerns whose title matches a rule-based flag, to avoid duplicates.
    const known = new Set(result.flags.map((f) => f.title.toLowerCase()));
    ai.concerns.slice(0, 6).filter((c) => c && c.title && !known.has(String(c.title).toLowerCase())).forEach((c) =>
      result.flags.push({
        severity: ["high", "medium", "low"].includes(c.severity) ? c.severity : "medium",
        title: String(c.title).slice(0, 120), detail: String(c.detail || ""), fix: String(c.fix || ""), evidence: c.evidence ? String(c.evidence).slice(0, 120) : undefined, source: "ai",
      })
    );
    // After adding AI flags, recompute the score, order and verdict using the same weights and bands as utils/authenticity.js.
    const w = { high: 15, medium: 8, low: 3 };
    result.score = Math.max(0, 100 - result.flags.reduce((s, f) => s + w[f.severity], 0));
    result.flags.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]));
    result.verdict = result.score >= 85 ? "Highly credible" : result.score >= 65 ? "Mostly credible, a few points to verify" : result.score >= 40 ? "Needs attention" : "Raises credibility concerns";
  }
  res.json({ ...result, aiUsed: !!ai });
});

// LinkedIn tool
/* ------------------------------ linkedin ------------------------------ */
const LINKEDIN_SYS = `You are a LinkedIn profile strategist. From the resume, write optimized LinkedIn content using ONLY facts present in the resume. Never invent employers, titles, or metrics.
Respond with STRICT JSON ONLY:
{"headlines":[5 distinct headlines, each max 120 chars, keyword-rich],
 "about":"3 short paragraphs in first person (hook, proof, call to action), max 1800 chars",
 "experience":[{"role":"","company":"","description":"2-4 lines, each starting with '• '"}],
 "skillsToAdd":[up to 8 skills worth listing],
 "tips":[3-5 profile tips specific to this candidate]}`;

// Rule-based LinkedIn content (used when the AI is unavailable): builds headlines, an About text, experience
// and tips from the heuristic profile. Picks the best-matching role unless a target role was given.
function linkedinFallback(profile, targetRole) {
  const best = matchRoles(profile.skills, { top: 1 })[0];
  const role = targetRole || (best && best.matchScore > 0 ? best.role : "Professional");
  const sk = profile.skills.slice(0, 4).map(title);
  const yrs = profile.yearsExperience;
  const exp = yrs >= 1 ? `${Math.round(yrs)}+ years of experience` : "early in my career";
  const about = [
    `I'm a ${role.toLowerCase()} ${yrs >= 1 ? "with " + exp : "who is " + exp}${sk.length ? `, working with ${sk.join(", ")}` : ""}.`,
    profile.projects.length ? `Recently I've worked on ${profile.projects.slice(0, 2).map((p) => p.name).join(" and ")}${profile.projects[0].description ? `. ${profile.projects[0].description}` : "."}` : "",
    `I'm open to ${role} opportunities and always happy to connect with people building good products.`,
  ].filter(Boolean).join("\n\n");
  return {
    headlines: [
      `${role}${sk.length ? " | " + sk.slice(0, 3).join(" · ") : ""}`,
      `${role} | ${yrs >= 1 ? Math.round(yrs) + "+ years building and shipping" : "Early-career, building real projects"}`,
      `Building with ${sk[0] || "modern tools"} | ${role}`,
    ],
    about,
    experience: profile.experience.slice(0, 5).map((e) => ({ role: e.role, company: e.company, description: e.bullets.slice(0, 3).map((b) => `• ${b}`).join("\n") })),
    skillsToAdd: (best ? best.missingSkills : []).slice(0, 6).map(title),
    tips: [
      "Use a clear, professional photo and a banner that signals your field.",
      "Put your strongest keywords in the headline: recruiters search it first.",
      "Add links to 2-3 projects in the Featured section.",
      "Ask two colleagues or mentors for recommendations.",
      "Pin 5 skills you can talk about in an interview, and get them endorsed.",
    ],
  };
}

// POST /api/tools/linkedin { resumeId | text, targetRole?, tone? }: returns headlines, about, experience, skills to add and tips.
const linkedinSuggestions = wrap(async (req, res) => {
  const { text } = await loadInput(req);
  const targetRole = typeof req.body.targetRole === "string" ? req.body.targetRole.slice(0, 80) : "";
  // Only allow known tones, otherwise default to "professional".
  const tone = ["professional", "friendly", "bold"].includes(req.body.tone) ? req.body.tone : "professional";
  const profile = heuristicProfile(text);

  const ai = await tryLLM(LINKEDIN_SYS, `Tone: ${tone}\nTarget role: ${targetRole || "infer from the resume"}\n\nResume:\n${cap(text)}`, { maxTokens: 3000 });
  const base = linkedinFallback(profile, targetRole);
  // Use the AI answer only if it has the expected shape, truncating each field; otherwise use the fallback.
  const out = ai && Array.isArray(ai.headlines)
    ? {
        headlines: ai.headlines.slice(0, 5).map((h) => String(h).slice(0, 140)),
        about: String(ai.about || base.about).slice(0, 2600),
        experience: Array.isArray(ai.experience) ? ai.experience.slice(0, 6).map((e) => ({ role: String(e.role || ""), company: String(e.company || ""), description: String(e.description || "") })) : base.experience,
        skillsToAdd: Array.isArray(ai.skillsToAdd) ? ai.skillsToAdd.slice(0, 8).map(String) : base.skillsToAdd,
        tips: Array.isArray(ai.tips) ? ai.tips.slice(0, 5).map(String) : base.tips,
      }
    : base;
  res.json({ ...out, aiUsed: !!(ai && Array.isArray(ai.headlines)) });
});

// Job recommendations tool
/* --------------------------- job recommendations --------------------------- */
const JOBS_SYS = `You are an experienced career counselor. Recommend job roles that fit the candidate, using ONLY evidence from the resume (skills, education, projects, experience). Be honest: do not inflate match scores. The baseline candidates come from a deterministic skill match; you may reorder them or add better ones.
Respond with STRICT JSON ONLY:
{"roles":[{"role":"","matchScore":0-100,"level":"Entry|Junior|Mid|Senior","why":["2-3 reasons citing resume evidence"],"matchedSkills":[],"missingSkills":[up to 5],"nextStep":"one concrete action"}]}
Return 5-6 roles sorted by matchScore descending.`;

// Maps estimated years of experience to a seniority level.
const levelFor = (y) => (y < 1 ? "Entry" : y < 3 ? "Junior" : y < 6 ? "Mid" : "Senior");

// POST /api/tools/jobs { resumeId | text }: recommends roles. Baseline candidates come from skill matching;
// the AI may reorder or add to them, otherwise the baseline is returned.
const jobRecommendations = wrap(async (req, res) => {
  const { text } = await loadInput(req);
  const profile = heuristicProfile(text);
  const candidates = matchRoles(profile.skills, { top: 8 });

  const ai = await tryLLM(
    JOBS_SYS,
    `Detected skills: ${profile.skills.join(", ") || "none detected"}\nEstimated years of work experience: ${profile.yearsExperience}\nBaseline candidates: ${JSON.stringify(candidates.map((c) => ({ role: c.role, matchScore: c.matchScore, missingSkills: c.missingSkills.slice(0, 5) })))}\n\nResume:\n${cap(text)}`,
    { maxTokens: 2500 }
  );

  // Clean the AI output: limit list sizes, clamp matchScore to 0-100 and sort best first.
  const aiRoles = ai && Array.isArray(ai.roles)
    ? ai.roles.slice(0, 6).filter((r) => r && r.role).map((r) => ({
        role: String(r.role).slice(0, 80),
        matchScore: Math.max(0, Math.min(100, Math.round(Number(r.matchScore) || 0))),
        level: ["Entry", "Junior", "Mid", "Senior"].includes(r.level) ? r.level : levelFor(profile.yearsExperience),
        why: Array.isArray(r.why) ? r.why.slice(0, 3).map(String) : [],
        matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills.slice(0, 10).map(String) : [],
        missingSkills: Array.isArray(r.missingSkills) ? r.missingSkills.slice(0, 5).map(String) : [],
        nextStep: String(r.nextStep || ""),
      })).sort((a, b) => b.matchScore - a.matchScore)
    : null;

  // Fall back to the rule-based candidates when the AI gave nothing.
  const roles = aiRoles && aiRoles.length
    ? aiRoles
    : candidates.slice(0, 6).map((c) => ({
        role: c.role,
        matchScore: c.matchScore,
        level: levelFor(profile.yearsExperience),
        why: c.matchedSkills.length ? [`Your resume lists ${c.matchedSkills.slice(0, 5).join(", ")}, which this role uses.`] : ["No overlapping skills detected yet."],
        matchedSkills: c.matchedSkills,
        missingSkills: c.missingSkills.slice(0, 5),
        nextStep: c.missingSkills[0] ? `Add a project that uses ${c.missingSkills[0]}.` : "Apply: your skills cover this role's core stack.",
      }));

  res.json({
    profile: { skills: profile.skills, yearsExperience: profile.yearsExperience, education: profile.education.map((e) => e.degree).filter(Boolean), projectsCount: profile.projects.length },
    roles,
    aiUsed: !!(aiRoles && aiRoles.length),
  });
});

// Skill gap and roadmap tool
/* ------------------------- skill gap + roadmap ------------------------- */
const ROADMAP_SYS = `You design practical, personalised learning roadmaps. Given a candidate's current skills and the skills a target role needs, create a phased plan. Prioritise high-priority missing skills first, make each phase end in a concrete project, and size the phases to the hours per week available. Do NOT include URLs; name resource types or well-known official docs instead.
Respond with STRICT JSON ONLY:
{"summary":"2 sentences on where the candidate stands","roadmap":[{"phase":1,"title":"","weeks":number,"goals":[],"topics":[],"project":"","resources":[]}],"tips":[3 short tips]}
Use 3-5 phases.`;

// POST /api/tools/roadmap { resumeId | text, targetRole?, jobDescription?, hoursPerWeek? }:
// compares the resume's skills with the target skills and builds a learning plan.
const skillRoadmap = wrap(async (req, res) => {
  const { text } = await loadInput(req);
  const targetRole = typeof req.body.targetRole === "string" ? req.body.targetRole.trim().slice(0, 80) : "";
  const jobDescription = typeof req.body.jobDescription === "string" ? req.body.jobDescription.slice(0, 5000) : "";
  // Hours per week is clamped to between 2 and 40 (default 10).
  const hours = Math.max(2, Math.min(40, parseInt(req.body.hoursPerWeek, 10) || 10));

  const role = findRole(targetRole);
  // Target skills come from the job description if given; if fewer than 3 are found, add the role's standard skills.
  let target = jobDescription.trim() ? extractSkills(jobDescription) : [];
  if (target.length < 3 && role) target = Array.from(new Set([...target, ...role.skills]));
  if (!target.length)
    throw httpError(400, "Pick a role from the list, or paste a job description that mentions specific skills.");
  // Cap at 25 target skills.
  target = target.slice(0, 25);
  const roleTitle = role && !jobDescription.trim() ? role.title : targetRole || (role && role.title) || "the target role";

  const have = new Set(extractSkills(text));
  const matched = target.filter((s) => have.has(s));
  const missingList = target.filter((s) => !have.has(s));
  // Missing skills are ranked by order: first third = high priority, second third = medium, the rest = low.
  const missing = missingList.map((skill, i) => ({
    skill,
    priority: i < Math.ceil(missingList.length / 3) ? "high" : i < Math.ceil((missingList.length * 2) / 3) ? "medium" : "low",
  }));
  // Readiness = percent of target skills the resume already covers.
  const readiness = Math.round((matched.length / target.length) * 100);

  // Only ask the AI if there is something missing to learn.
  const ai = missingList.length
    ? await tryLLM(
        ROADMAP_SYS,
        `Target role: ${roleTitle}\nHours per week: ${hours}\nSkills the candidate already has: ${matched.join(", ") || "none detected"}\nMissing skills (highest priority first): ${missingList.join(", ")}\n\nResume excerpt:\n${cap(text, 3000)}`,
        { maxTokens: 3000 }
      )
    : null;

  // Use the AI roadmap (max 5 phases, weeks clamped to 1-26) or the deterministic fallback roadmap.
  const phases = ai && Array.isArray(ai.roadmap) && ai.roadmap.length
    ? ai.roadmap.slice(0, 5).map((p, i) => ({
        phase: i + 1,
        title: String(p.title || `Phase ${i + 1}`).slice(0, 100),
        weeks: Math.max(1, Math.min(26, Math.round(Number(p.weeks) || 2))),
        goals: Array.isArray(p.goals) ? p.goals.slice(0, 5).map(String) : [],
        topics: Array.isArray(p.topics) ? p.topics.slice(0, 8).map(String) : [],
        project: String(p.project || ""),
        resources: Array.isArray(p.resources) ? p.resources.slice(0, 5).map(String) : [],
      }))
    : fallbackRoadmap(missingList, roleTitle, hours);

  res.json({
    targetRole: roleTitle,
    readiness,
    matchedSkills: matched,
    missingSkills: missing,
    summary: ai && ai.summary ? String(ai.summary) : missingList.length ? `You already cover ${matched.length} of ${target.length} skills for ${roleTitle}. Focus on ${missingList.slice(0, 3).join(", ")} first.` : `You already cover every skill we checked for ${roleTitle}.`,
    roadmap: phases,
    totalWeeks: phases.reduce((s, p) => s + p.weeks, 0),
    tips: ai && Array.isArray(ai.tips) ? ai.tips.slice(0, 4).map(String) : [],
    aiUsed: !!(ai && Array.isArray(ai.roadmap) && ai.roadmap.length),
  });
});

// Portfolio tool
/* ------------------------------ portfolio ------------------------------ */
const PORTFOLIO_SYS = `You extract and polish resume data for a personal portfolio website. Use ONLY information present in the resume; never invent employers, links, or metrics.
Respond with STRICT JSON ONLY:
{"name":"","headline":"max 100 chars","about":"2-3 sentences, first person","email":"","phone":"","location":"","links":[{"label":"","url":""}],"skills":[],"experience":[{"role":"","company":"","period":"","bullets":[]}],"projects":[{"name":"","description":"","link":"","tech":""}],"education":[{"degree":"","school":"","period":""}]}`;

// Returns the AI value for a key if present and non-empty, otherwise the rule-based value.
const pick = (ai, base, key) => (ai && ai[key] && (!Array.isArray(ai[key]) || ai[key].length) ? ai[key] : base[key]);

// POST /api/tools/portfolio: builds profile data and a ready-to-use HTML portfolio page. Returns { profile, html, aiUsed }.
const portfolioGenerate = wrap(async (req, res) => {
  const { theme, accent, profile: clientProfile } = req.body;
  // Re-render path: the client edited the profile or changed the theme; no LLM call needed.
  if (clientProfile && typeof clientProfile === "object") {
    const profile = normalizeProfile(clientProfile);
    return res.json({ profile, html: renderPortfolio(profile, { theme, accent }), aiUsed: false });
  }

  const { text, resume } = await loadInput(req);
  // Builder resumes already have structured data, so use it directly; otherwise parse the text.
  const base = resume && resume.source === "builder" && resume.builderData ? builderToProfile(resume.builderData) : heuristicProfile(text);
  const ai = await tryLLM(PORTFOLIO_SYS, cap(text), { maxTokens: 3000 });
  // Merge: prefer AI values, fall back to the rule-based profile.
  const merged = ai
    ? { ...base, name: pick(ai, base, "name"), headline: pick(ai, base, "headline"), about: pick(ai, base, "about") || base.summary, email: pick(ai, base, "email"), phone: pick(ai, base, "phone"), location: pick(ai, base, "location"), links: pick(ai, base, "links"), skills: pick(ai, base, "skills"), experience: pick(ai, base, "experience"), projects: pick(ai, base, "projects"), education: pick(ai, base, "education") }
    : { ...base, about: base.summary };
  // If there is still no headline, use the best-matching role name.
  if (!merged.headline) {
    const best = matchRoles(base.skills, { top: 1 })[0];
    merged.headline = best && best.matchScore > 0 ? best.role : "";
  }
  const profile = normalizeProfile(merged);
  res.json({ profile, html: renderPortfolio(profile, { theme, accent }), aiUsed: !!ai });
});

// GET /api/tools/roles: list of role names for the frontend dropdown.
const listRoles = (req, res) => res.json({ roles: ROLES.map((r) => r.title) });

module.exports = { grammarCheck, authenticityCheck, linkedinSuggestions, jobRecommendations, skillRoadmap, portfolioGenerate, listRoles };
