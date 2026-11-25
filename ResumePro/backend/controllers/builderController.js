// Controllers for the resume builder: AI-generated bullets/summary and saving builder resumes.
const Resume = require("../models/Resume");
const { askLLM } = require("../utils/llm");

// Instructions sent to the AI model describing how to write bullet points; it must answer in JSON.
const BULLET_SYSTEM_PROMPT = `You are an expert resume writer. Given a rough, informal description of a work
achievement, rewrite it into 1-3 polished, ATS-friendly resume bullet points. Each bullet should:
- start with a strong past-tense action verb (or present-tense if it's a current role)
- quantify impact wherever plausible (infer reasonable metrics only if the user implies them, otherwise focus on scope/outcome without inventing numbers)
- stay under 220 characters
Respond with STRICT JSON ONLY: { "bullets": string[] }`;

// Instructions for writing the professional summary; also expects a JSON answer.
const SUMMARY_SYSTEM_PROMPT = `You are an expert resume writer. Given a candidate's target role, years of experience,
and key skills/achievements, write a punchy 2-3 sentence professional summary for the top of their resume.
Respond with STRICT JSON ONLY: { "summary": string }`;

// POST /api/builder/generate-bullets { rawDescription, role }: turns a rough description into polished bullets.
// Returns { bullets: [] }. 400 if the description is empty, 502 if the AI call fails.
async function generateBullets(req, res) {
  try {
    const { rawDescription, role } = req.body;
    if (!rawDescription || !rawDescription.trim()) {
      return res.status(400).json({ message: "Please describe what you did in this role/project" });
    }
    const userPrompt = `Target role context: ${role || "not specified"}\nRough description: "${rawDescription}"`;
    const result = await askLLM(BULLET_SYSTEM_PROMPT, userPrompt);
    res.json({ bullets: result.bullets || [] });
  } catch (err) {
    res.status(502).json({
      message: "AI bullet generation is unavailable right now (check your LLM API key).",
      error: err.message,
    });
  }
}

// POST /api/builder/generate-summary { targetRole, yearsExperience, keySkills }: returns { summary }.
// Only targetRole is required.
async function generateSummary(req, res) {
  try {
    const { targetRole, yearsExperience, keySkills } = req.body;
    if (!targetRole) {
      return res.status(400).json({ message: "targetRole is required" });
    }
    const userPrompt = `Target role: ${targetRole}\nYears of experience: ${yearsExperience || "unspecified"}\nKey skills/achievements: ${keySkills || "unspecified"}`;
    const result = await askLLM(SUMMARY_SYSTEM_PROMPT, userPrompt);
    res.json({ summary: result.summary || "" });
  } catch (err) {
    res.status(502).json({
      message: "AI summary generation is unavailable right now (check your LLM API key).",
      error: err.message,
    });
  }
}

// Saves a builder resume. Handles both routes below, depending on whether req.params.id exists:
// POST /api/builder  { title, builderData }  -> create
// PUT  /api/builder/:id { title, builderData } -> update
async function saveBuilderResume(req, res) {
  try {
    const { title, builderData } = req.body;
    if (!builderData) return res.status(400).json({ message: "builderData is required" });

    // Update path: only matches if the resume belongs to this user; upsert: false means it never creates a new one.
    let resume;
    if (req.params.id) {
      resume = await Resume.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { title: title || "Untitled Resume", builderData, source: "builder" },
        { new: true, upsert: false }
      );
      if (!resume) return res.status(404).json({ message: "Resume not found" });
    // Create path (no id in the URL).
    } else {
      resume = await Resume.create({
        user: req.user._id,
        source: "builder",
        title: title || "Untitled Resume",
        builderData,
      });
    }

    res.status(201).json({ resume });
  } catch (err) {
    res.status(500).json({ message: "Could not save resume", error: err.message });
  }
}

module.exports = { generateBullets, generateSummary, saveBuilderResume };
