// Rule-based "resume credibility" checker. It looks for things a recruiter might question (impossible dates,
// gaps, inflated claims, copied text...) and returns a score, a verdict and a list of flags.
// It does not prove anything; these are only warning signs.
const { parseRanges, mergedMonths, BULLET } = require("./resumeText");
const { extractSkills } = require("./roleCatalog");

// Regexes for words indicating a senior job title.
const SENIOR = /\b(senior|sr\.|lead|principal|director|head of|vp\b|vice president|chief|architect|manager)\b/i;
// Throwaway email domains.
const DISPOSABLE = /@(mailinator|10minutemail|guerrillamail|tempmail|yopmail|trashmail)\./i;
// Overused buzzwords; flag g lets match() return every occurrence.
const CLICHES = /\b(hard[- ]?working|team player|detail[- ]oriented|results[- ]driven|passionate|go[- ]getter|self[- ]motivated|dynamic|synergy|think outside the box|fast learner|quick learner)\b/gi;

// Turns a month index (years*12 + month) back into text such as "Mar 2021".
const mon = (idx) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][idx % 12] + " " + Math.floor(idx / 12);
// Shortens long text to n characters, ending with an ellipsis.
const clip = (s, n = 120) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
// Splits text into overlapping runs of k (default 5) words, used to detect word-for-word copying.
const shingles = (s, k = 5) => {
  const w = s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  return out;
};

// Main function. Input: resume text and an optional job description.
// Output: { score (0-100), verdict, flags, stats, disclaimer }.
function checkAuthenticity(text = "", { jobDescription = "" } = {}) {
  const flags = [];
  // Helper that records one flag with a severity (high/medium/low), what was found, how to fix it, and optional evidence text.
  const add = (severity, title, detail, fix, evidence) => flags.push({ severity, title, detail, fix, evidence: evidence ? clip(evidence) : undefined });

  // Date ranges (jobs and education) found in the text by resumeText.js.
  const ranges = parseRanges(text);
  const work = ranges.filter((r) => r.kind === "work");
  const edu = ranges.filter((r) => r.kind === "education");
  const thisYear = new Date().getFullYear();
  // Total months actually worked (overlaps merged), converted to years with one decimal.
  const computedYears = Math.round((mergedMonths(work) / 12) * 10) / 10;

  // 1. impossible dates
  ranges.forEach((r) => {
    // Education may start up to 6 years ahead (e.g. planned degrees); jobs may not start in the future.
    if (r.startYear > thisYear + (r.kind === "education" ? 6 : 0))
      add("high", "Start date is in the future", `"${r.raw}" starts after ${thisYear}.`, "Correct the date, or mark the role as upcoming.", r.text);
    else if (r.end < r.start)
      add("high", "Date range ends before it starts", `"${r.raw}" is reversed.`, "Fix the order of the dates.", r.text);
  });

  // 2. gaps and overlaps between jobs
  // Sort jobs by start date; maxEnd tracks the latest end seen so far, to detect gaps and overlaps.
  const sorted = [...work].filter((r) => r.end >= r.start).sort((a, b) => a.start - b.start);
  let maxEnd = null;
  let maxEndRange = null;
  sorted.forEach((r) => {
    if (maxEnd !== null) {
      const gap = r.start - maxEnd;
      // More than 12 months between jobs counts as a gap.
      if (gap > 12) add("low", `Unexplained gap of about ${Math.round(gap / 12 * 10) / 10} years`, `Nothing is listed between ${mon(maxEnd)} and ${mon(r.start)}.`, "Add a short line for what you did (study, freelance, caregiving, upskilling).", r.text);
      const overlap = maxEnd - r.start;
      // Overlap longer than a year is suspicious unless the later role is ongoing.
      if (overlap > 12 && !r.ongoing)
        add("medium", "Two roles overlap by more than a year", `"${maxEndRange.text}" and "${r.text}" run at the same time.`, "If one was part-time, freelance or an internship, say so explicitly.", r.text);
    }
    if (maxEnd === null || r.end > maxEnd) { maxEnd = r.end; maxEndRange = r; }
  });

  // 3. claimed vs. demonstrated experience
  // Looks for phrases like "8+ years of experience" (up to 25 non-period chars between 'years' and 'experience').
  const claim = text.match(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b[^.\n]{0,25}\bexperience/i);
  if (claim && computedYears > 0) {
    const claimed = parseInt(claim[1], 10);
    // Flag if the claim exceeds the computed years by more than 2.
    if (claimed - computedYears > 2)
      add("high", "Claimed experience is higher than the dated roles show", `You state ${claimed}+ years, but the dated work history adds up to about ${computedYears}.`, "Either list the missing roles with dates or adjust the claim.", claim[0]);
  }

  // 4. seniority vs. total experience
  // Find a line with a senior-style title that also contains a work date range.
  const seniorLine = text.split(/\r?\n/).find((l) => SENIOR.test(l) && parseRanges(l).some((r) => r.kind === "work"));
  if (seniorLine && computedYears > 0 && computedYears < 2)
    add("medium", "Senior title with under two years of experience", `Dated experience totals about ${computedYears} years.`, "Make sure the title is accurate, or explain the scope that justified it.", seniorLine.trim());

  // 5. extreme metrics
  // Find percentages with 3+ digits (commas allowed) and keep those of 300% or more.
  const bigPct = [...text.matchAll(/(\d[\d,]{2,})\s*%/g)].map((m) => parseInt(m[1].replace(/,/g, ""), 10)).filter((v) => v >= 300);
  if (bigPct.length)
    add("medium", "Very large percentage claims", `Found ${bigPct.map((v) => v + "%").join(", ")}. Extreme figures need a baseline to be believable.`, "State the before and after numbers (e.g. 'from 200 to 900 users') and the timeframe.");
  // Count occurrences of "100%"; three or more looks inflated.
  const hundred = (text.match(/\b100\s*%/g) || []).length;
  if (hundred >= 3) add("low", `"100%" appears ${hundred} times`, "Repeated perfect figures look inflated.", "Use specific counts or ranges where you can.");

  // 6. skill inflation
  const skills = extractSkills(text);
  // Count self-ratings like expert/master/guru/advanced.
  const expertClaims = (text.match(/\b(expert|master|guru|advanced)\b/gi) || []).length;
  // Thresholds: over 35 skills or 6+ expert-type words trigger a flag.
  if (skills.length > 35) add("medium", "Very long skill list", `${skills.length} recognised skills in one resume dilutes credibility.`, "Keep skills you can discuss in an interview, ordered by strength.");
  if (expertClaims >= 6) add("medium", `Many self-rated 'expert/advanced' claims (${expertClaims})`, "Self-ratings are rarely trusted without evidence.", "Replace labels with proof: projects, years of use, outcomes.");

  // 7. cliché density
  // Four or more buzzwords triggers a flag.
  const cliches = text.match(CLICHES) || [];
  if (cliches.length >= 4) add("low", `${cliches.length} generic buzzwords`, `Examples: ${[...new Set(cliches.map((c) => c.toLowerCase()))].slice(0, 4).join(", ")}.`, "Swap each for a concrete example.");

  // 8. copy-pasted bullets
  // Collect bullet lines with their bullet marker removed.
  const bullets = text.split(/\r?\n/).filter((l) => BULLET.test(l)).map((l) => l.replace(BULLET, "").trim());
  const seen = new Map();
  bullets.forEach((b) => {
    // Normalise (lower-case, drop punctuation) so near-identical bullets match; ignore short ones (under 25 chars).
    const k = b.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    if (k.length >= 25) seen.set(k, (seen.get(k) || 0) + 1);
  });
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  if (dups.length) add("medium", "Repeated bullet text", `${dups.length} bullet(s) appear more than once.`, "Rewrite each role's bullets so they describe that role's own work.", dups[0][0]);

  // 9. keyword stuffing / copied job description
  // Count how many times each detected skill appears, using a whole-word regex.
  const freq = {};
  skills.forEach((s) => {
    const re = new RegExp(`(?<![a-z0-9+#])${s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(?![a-z0-9+#])`, "gi");
    freq[s] = (text.match(re) || []).length;
  });
  // A skill mentioned 8+ times is considered stuffing.
  const stuffed = Object.entries(freq).filter(([, c]) => c >= 8);
  if (stuffed.length) add("medium", "Possible keyword stuffing", `${stuffed.map(([s, c]) => `"${s}" ×${c}`).join(", ")}.`, "Mention a skill where you used it, not repeatedly. ATS and recruiters both notice stuffing.");
  if (jobDescription.trim()) {
    // Compare 5-word phrases of the job description and resume; 3+ shared phrases is suspicious, 8+ is high severity.
    const jd = shingles(jobDescription);
    const resume = shingles(text);
    const shared = [...resume].filter((s) => jd.has(s));
    if (shared.length >= 3)
      add(shared.length >= 8 ? "high" : "medium", "Text copied from the job description", `${shared.length} five-word phrases match the posting word for word.`, "Describe your own work in your own words, then mirror keywords naturally.", shared[0]);
  }

  // 10. contact / verifiability
  // Look for any email address.
  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (!email) add("medium", "No email address found", "Employers cannot verify or contact you.", "Add a professional email.");
  else if (DISPOSABLE.test(email[0])) add("medium", "Disposable email domain", `${email[0]} looks like a throwaway address.`, "Use a stable personal email.");
  if (!/linkedin\.com|github\.com|gitlab\.com|behance\.net|portfolio|dribbble\.com/i.test(text))
    add("low", "Nothing publicly verifiable", "No LinkedIn, GitHub or portfolio link.", "Add at least one link where your work can be checked.");

  // Each flag removes points from 100: high 15, medium 8, low 3.
  const weights = { high: 15, medium: 8, low: 3 };
  const score = Math.max(0, 100 - flags.reduce((s, f) => s + weights[f.severity], 0));
  const order = { high: 0, medium: 1, low: 2 };
  // Show the most severe flags first.
  flags.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    score,
    // Verdict bands: 85+, 65-84, 40-64, below 40.
    verdict: score >= 85 ? "Highly credible" : score >= 65 ? "Mostly credible, a few points to verify" : score >= 40 ? "Needs attention" : "Raises credibility concerns",
    flags,
    stats: { datedRoles: work.length, computedYears, skillsDetected: skills.length, bullets: bullets.length },
    disclaimer: "These are credibility signals a recruiter might question. They are not proof of dishonesty, and a flag is often just missing context.",
  };
}

module.exports = { checkAuthenticity };
