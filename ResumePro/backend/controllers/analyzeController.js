// Controllers that analyse resumes: extract text, score it with rules (atsScore.js) and with an AI model,
// then save the combined result in the database.
const fs = require("fs");
const Resume = require("../models/Resume");
const { extractText } = require("../utils/fileParser");
const { computeHeuristics } = require("../utils/atsScore");
const { askLLM } = require("../utils/llm");

// Instructions for the AI model. It must reply with JSON of the shape described here.
const SYSTEM_PROMPT = `You are an expert technical recruiter and resume coach. You analyze resumes with the
rigor of an ATS (applicant tracking system) plus the judgment of a hiring manager.
Always respond with STRICT JSON ONLY, no markdown fences, no preamble, matching this shape exactly:
{
  "overallScore": number (0-100),
  "strengths": string[] (3-6 concise bullet points),
  "weaknesses": string[] (3-6 concise bullet points),
  "suggestions": string[] (4-8 specific, actionable rewrite suggestions),
  "skillGaps": string[] (skills the candidate seems to be missing for their apparent target role, or relative to the job description if provided)
}
Be specific and reference actual content from the resume. Do not be generic.`;

// Builds the text sent to the AI: the resume (cut to 8000 chars) and, if given, the job description
// (cut to 4000 chars) to keep the prompt a reasonable size.
function buildUserPrompt(resumeText, jobDescription) {
  let prompt = `Resume text:\n"""\n${resumeText.slice(0, 8000)}\n"""\n`;
  if (jobDescription && jobDescription.trim()) {
    prompt += `\nTarget job description:\n"""\n${jobDescription.slice(0, 4000)}\n"""\n\nEvaluate the resume specifically against this job description.`;
  } else {
    prompt += `\nNo specific job description was provided — evaluate the resume generally for the role it appears to target.`;
  }
  return prompt;
}

// Runs the full analysis. Inputs: resume text and an optional job description.
// Output: an object matching the Resume model's analysis schema.
// Rule-based scores always come from heuristics; the AI supplies strengths, weaknesses, suggestions and skill gaps.
async function runAnalysis(resumeText, jobDescription) {
  const heuristics = computeHeuristics(resumeText, jobDescription);

  // Default result used if the AI call fails, so the app still returns something useful.
  let llmResult = {
    overallScore: heuristics.atsScore,
    strengths: [],
    weaknesses: [],
    suggestions: [],
    skillGaps: [],
  };

  try {
    llmResult = await askLLM(SYSTEM_PROMPT, buildUserPrompt(resumeText, jobDescription));
  } catch (err) {
    // Fall back gracefully to heuristic-only results if the LLM call fails
    // (e.g. missing/invalid API key). The app should still be usable.
    llmResult.suggestions = [
      "AI analysis is currently unavailable (check your LLM API key in the backend .env file). Showing rule-based scoring only.",
    ];
    console.error("[analyze] LLM call failed:", err.message);
  }

  return {
    atsScore: heuristics.atsScore,
    // ?? uses the heuristic score only if the AI gave no overallScore.
    overallScore: llmResult.overallScore ?? heuristics.atsScore,
    jobDescription: jobDescription || "",
    matchScore: heuristics.matchScore,
    matchedKeywords: heuristics.matchedKeywords,
    missingKeywords: heuristics.missingKeywords,
    strengths: llmResult.strengths || [],
    weaknesses: llmResult.weaknesses || [],
    suggestions: llmResult.suggestions || [],
    sectionScores: heuristics.sectionScores,
    skillGaps: llmResult.skillGaps || [],
  };
}

// POST /api/analyze/upload  (multipart/form-data: file, jobDescription?)
// Uploads a resume file, extracts its text, analyses it and saves a new Resume. Returns 201 with { resume }.
async function analyzeUpload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rawText = await extractText(req.file.path, req.file.mimetype);
    fs.unlink(req.file.path, () => {}); // best-effort cleanup, don't block response

    // Fewer than 50 characters usually means a scanned/image PDF or an empty file.
    if (!rawText || rawText.trim().length < 50) {
      return res.status(422).json({
        message: "Could not extract enough text from this file. Try a different PDF/DOCX export.",
      });
    }

    const analysis = await runAnalysis(rawText, req.body.jobDescription);

    const resume = await Resume.create({
      user: req.user._id,
      source: "uploaded",
      // Use the file name without its extension (regex removes the last ".ext") as the title.
      title: req.file.originalname.replace(/\.[^/.]+$/, ""),
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      rawText,
      analysis,
    });

    res.status(201).json({ resume });
  } catch (err) {
    res.status(500).json({ message: "Analysis failed", error: err.message });
  }
}

// POST /api/analyze/text  { resumeText, jobDescription?, title? }
// Analyses pasted text instead of a file; needs at least 50 characters. Saves and returns the new resume.
async function analyzeText(req, res) {
  try {
    const { resumeText, jobDescription, title } = req.body;
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({ message: "Please provide at least a few sentences of resume text" });
    }

    const analysis = await runAnalysis(resumeText, jobDescription);

    const resume = await Resume.create({
      user: req.user._id,
      source: "uploaded",
      title: title || "Pasted Resume",
      rawText: resumeText,
      analysis,
    });

    res.status(201).json({ resume });
  } catch (err) {
    res.status(500).json({ message: "Analysis failed", error: err.message });
  }
}

// POST /api/analyze/:id/rematch  { jobDescription }
// Re-runs the analysis of a saved resume against a (new) job description and overwrites the stored analysis.
async function rematchAgainstJob(req, res) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const analysis = await runAnalysis(resume.rawText, req.body.jobDescription);
    resume.analysis = analysis;
    await resume.save();

    res.json({ resume });
  } catch (err) {
    res.status(500).json({ message: "Re-analysis failed", error: err.message });
  }
}

module.exports = { analyzeUpload, analyzeText, rematchAgainstJob };
