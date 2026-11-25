// Deterministic, rule-based scoring that complements the LLM's qualitative
// analysis. Keeping this separate from the LLM means the app still returns a
// meaningful score even if the LLM call fails or is rate-limited.

// Verbs that signal achievements; used to score how impactful the resume sounds.
const ACTION_VERBS = [
  "led", "built", "created", "designed", "developed", "implemented", "managed",
  "launched", "improved", "increased", "reduced", "optimized", "automated",
  "delivered", "spearheaded", "architected", "drove", "achieved", "streamlined",
  "negotiated", "mentored", "founded", "scaled", "shipped",
];

// Headings a normal resume is expected to contain.
const SECTION_HEADERS = ["experience", "education", "skills", "projects", "summary", "certifications"];

// Scores resume layout/completeness from 0-100. Starts at 100 and subtracts points for each missing basic element.
function scoreFormatting(text) {
  let score = 100;
  const lower = text.toLowerCase();

  // Penalty if fewer than 3 standard section names appear anywhere in the text.
  const hasSections = SECTION_HEADERS.filter((h) => lower.includes(h)).length;
  if (hasSections < 3) score -= 25;

  // Rough email pattern: name chars, @, domain, dot, 2+ letter ending.
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  if (!hasEmail) score -= 15;

  // Rough phone pattern: optional +, digits, then 7+ digits/spaces/dashes/dots/brackets, ending on a digit.
  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
  if (!hasPhone) score -= 10;

  // Too short (under 150 words) or too long (over 1200 words) is penalised.
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 150) score -= 20;
  if (wordCount > 1200) score -= 10;

  // Count lines that begin with a bullet character (•, - or *).
  const bulletCount = (text.match(/(^|\n)\s*[•\-\*]/g) || []).length;
  if (bulletCount < 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// Scores achievement language from 0-100: base 40, +4 per action verb found, +3 per number or percentage (capped at 100).
function scoreImpact(text) {
  const lower = text.toLowerCase();
  const verbHits = ACTION_VERBS.filter((v) => lower.includes(v)).length;
  // Matches whole numbers, decimals and percentages such as 25, 3.5 or 40%.
  const numberHits = (text.match(/\b\d+(\.\d+)?%?\b/g) || []).length;

  let score = 40 + verbHits * 4 + numberHits * 3;
  return Math.max(0, Math.min(100, score));
}

// Scores readability from 0-100 using the average sentence length (in words).
function scoreClarity(text) {
  // Treat both periods and line breaks as sentence ends, since resumes use bullets without periods.
  const sentences = text.split(/[.\n]/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return 0;

  const avgLen =
    sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

  let score = 100;
  // Penalties: average over 30 words, over 45 (stacks with the first), or under 4 (fragmentary).
  if (avgLen > 30) score -= 25;
  if (avgLen > 45) score -= 25;
  if (avgLen < 4) score -= 15;

  return Math.max(0, Math.min(100, score));
}

// Returns the unique meaningful words in a text: lower-cased, at least 3 characters, starting with a letter,
// allowing + # . / - inside (so "c++" or "ci/cd" survive), minus common stop words.
function extractKeywords(text) {
  const stop = new Set([
    "the", "and", "for", "with", "that", "this", "from", "have", "will",
    "your", "you", "are", "was", "were", "our", "their", "a", "an", "to",
    "of", "in", "on", "as", "is", "it", "be", "or", "at", "by",
  ]);
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-zA-Z][a-zA-Z+#./-]{2,}/g) || [])
        .filter((w) => !stop.has(w))
    )
  );
}

// Compares resume words with job-description words. Returns { score, matched, missing }.
// score is the percent of job-description words found in the resume, or null if there is no job description.
function scoreKeywordMatch(resumeText, jobDescription) {
  if (!jobDescription || !jobDescription.trim()) {
    return { score: null, matched: [], missing: [] };
  }
  const resumeWords = new Set(extractKeywords(resumeText));
  const jdWords = extractKeywords(jobDescription);
  const jdUnique = Array.from(new Set(jdWords));

  const matched = jdUnique.filter((w) => resumeWords.has(w));
  // Lists are capped at 25 items to keep the response small.
  const missing = jdUnique.filter((w) => !resumeWords.has(w)).slice(0, 25);

  const score = jdUnique.length
    ? Math.round((matched.length / jdUnique.length) * 100)
    : null;

  return { score, matched: matched.slice(0, 25), missing };
}

// Combines all the scores into the result used by the analyze controller.
function computeHeuristics(resumeText, jobDescription) {
  const formatting = scoreFormatting(resumeText);
  const impact = scoreImpact(resumeText);
  const clarity = scoreClarity(resumeText);
  const { score: matchScore, matched, missing } = scoreKeywordMatch(resumeText, jobDescription);

  // With no job description we can't measure keywords, so use a neutral 70.
  const keywordsScore = matchScore === null ? 70 : matchScore;
  // Weighted average: formatting 30%, impact 25%, clarity 20%, keywords 25%.
  const atsScore = Math.round(
    formatting * 0.3 + impact * 0.25 + clarity * 0.2 + keywordsScore * 0.25
  );

  return {
    atsScore,
    sectionScores: { formatting, impact, clarity, keywords: keywordsScore },
    matchScore: matchScore === null ? 0 : matchScore,
    matchedKeywords: matched,
    missingKeywords: missing,
  };
}

module.exports = { computeHeuristics, extractKeywords };
