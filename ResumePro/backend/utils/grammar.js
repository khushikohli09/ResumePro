// Rule-based grammar and style checker for resume text. Finds weak phrases, vague wording,
// typos, repetition and similar problems and returns a score with a list of issues.
const { BULLET } = require("./resumeText");
const { extractSkills } = require("./roleCatalog");

// Pairs of [regex, advice] for weak or passive phrases.
const WEAK = [
  [/\bresponsible for\b/i, "Weak phrase. Lead with a verb like Led, Managed, Owned or Delivered."],
  [/\bworked (?:on|with)\b/i, "Vague verb. Say what you did: Built, Developed, Designed or Tested."],
  [/\bhelped(?: to)?\b/i, "Understates your role. Use Supported, Enabled or Contributed to, and name the result."],
  [/\b(?:assisted|assisting) (?:with|in|on)\b/i, "Passive. State the part you owned, e.g. Implemented, Drafted, Analysed."],
  [/\binvolved in\b/i, "Says nothing about your contribution. Name the action you took."],
  [/\bparticipated in\b/i, "Passive. Use Contributed to, Collaborated on or Presented."],
  [/\bduties (?:included|include)\b/i, "Describes a job description, not achievements. Lead with a result."],
  [/\btasked with\b/i, "Weak phrase. Start with the action itself."],
  [/\bin charge of\b/i, "Prefer Led, Directed or Managed."],
  [/\bhandled\b/i, "Vague. Prefer Resolved, Processed, Coordinated or Administered."],
  [/\bdealt with\b/i, "Vague. Prefer Resolved, Negotiated or Managed."],
  [/\bused\b(?! to)/i, "Often filler. Say what you built or achieved with the tool."],
];

// Pairs of [regex, advice] for vague wording and clichés.
const VAGUE = [
  [/\bvarious\b/i, "Name the specific tools, clients or projects."],
  [/\bseveral\b/i, "Give the actual number."],
  [/\ba lot of\b/i, "Quantify it."],
  [/\b(?:stuff|things)\b/i, "Replace with the specific thing."],
  [/\betc\.?(?=\s|$|[,;)])/i, "Finish the list or drop 'etc.'"],
  [/\band so on\b/i, "Finish the list or drop it."],
  [/\bhard[- ]?working\b/i, "Cliché. Show it with a result instead."],
  [/\bteam player\b/i, "Cliché. Describe a team outcome you contributed to."],
  [/\bdetail[- ]oriented\b/i, "Cliché. Show it, e.g. 'caught 12 defects before release'."],
  [/\bresults[- ]driven\b/i, "Cliché. State a result instead."],
  [/\bpassionate\b/i, "Cliché. Show passion through projects or outcomes."],
  [/\bgo[- ]getter\b/i, "Cliché. Replace with evidence."],
  [/\bexcellent (?:communication|interpersonal) skills\b/i, "Claimed, not shown. Cite a presentation, stakeholder or outcome."],
  [/\bgood knowledge of\b/i, "Vague. Say how you used it."],
];

// Common misspellings -> correct spelling.
const MISSPELLINGS = {
  recieve: "receive", seperate: "separate", managment: "management", experiance: "experience",
  sucessful: "successful", successfull: "successful", responsibile: "responsible", developement: "development",
  enviroment: "environment", comunication: "communication", langauge: "language", knowlege: "knowledge",
  acheived: "achieved", achivement: "achievement", occured: "occurred", definately: "definitely",
  adress: "address", dependancy: "dependency", sofware: "software", applicaiton: "application",
};

// Stronger verbs to suggest instead of an overused opening verb.
const SYNONYMS = {
  developed: ["Built", "Engineered", "Implemented", "Designed"],
  managed: ["Led", "Directed", "Oversaw", "Coordinated"],
  created: ["Designed", "Built", "Launched", "Established"],
  worked: ["Collaborated", "Partnered", "Delivered", "Contributed"],
  implemented: ["Deployed", "Introduced", "Rolled out", "Built"],
  improved: ["Increased", "Reduced", "Optimised", "Streamlined"],
  used: ["Applied", "Leveraged", "Utilised"],
  helped: ["Supported", "Enabled", "Contributed to"],
  built: ["Engineered", "Developed", "Shipped", "Architected"],
  responsible: ["Owned", "Led", "Drove"],
};

// Common words ignored when counting repeated words.
const STOP = new Set("about after also been before being between both could during each from have into more most only other over same should since some such than that their them then there these they this those through under until very were what when where which while will with would your our you and the for are was has had not but can its who how all any one two use used using work worked working team teams project projects experience skills year years".split(" "));

// Shortens text to n characters with an ellipsis (used for excerpts).
const clip = (s, n = 140) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Splits text into lower-case words (letters, apostrophes, + # . -), removing trailing dots/hyphens.
function words(s) {
  return (s.toLowerCase().match(/[a-z][a-z'+#.-]*/g) || []).map((w) => w.replace(/[.-]+$/, ""));
}

// True for short all-capital tokens like "API" or "SQL" (2-5 chars).
function isAcronym(w) {
  return /^[A-Z0-9]{2,5}$/.test(w);
}

// Main function. Input: resume text. Output: { score, counts, total, issues } (see finalize()).
// Each issue has type, severity, line number, excerpt, message and suggestion.
function checkGrammar(text = "") {
  const lines = text.split(/\r?\n/);
  const issues = [];
  const push = (i) => issues.push(i);
  const bullets = [];

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;
    const n = idx + 1;
    const isBullet = BULLET.test(raw);
    const body = line.replace(BULLET, "");
    const wc = body.split(/\s+/).length;
    // Remember bullet-like lines (real bullets or sentences of 8+ words) for the checks after the loop.
    if (isBullet || wc >= 8) bullets.push({ n, body, isBullet });

    // Weak phrases only count in bullets or lines of at least 6 words, to avoid flagging headings.
    for (const [re, msg] of WEAK) {
      const m = body.match(re);
      if (m && (isBullet || wc >= 6)) push({ type: "weak-verb", severity: "medium", line: n, text: clip(body), match: m[0], message: msg, suggestion: msg });
    }
    for (const [re, msg] of VAGUE) {
      const m = body.match(re);
      if (m) push({ type: "vague", severity: "medium", line: n, text: clip(body), match: m[0], message: `"${m[0]}" is vague or generic.`, suggestion: msg });
    }

    // ---- grammar & typography ----
    // Double spaces (but not wide gaps of 3+ spaces, which are usually layout columns).
    if (/\S {2,}\S/.test(body) && !/\s{3,}/.test(body))
      push({ type: "grammar", severity: "low", line: n, text: clip(body), message: "Double space between words.", suggestion: "Use a single space." });

    // A repeated word such as "the the"; "had had" and "that that" are legitimate.
    const rep = body.match(/\b([A-Za-z]{2,})\s+\1\b/i);
    if (rep && !/^(had|that)$/i.test(rep[1]))
      push({ type: "grammar", severity: "high", line: n, text: clip(body), match: rep[0], message: `Repeated word: "${rep[0]}".`, suggestion: `Remove the duplicate "${rep[1]}".` });

    // Missing space after punctuation, e.g. "word,next". Skips URLs, file names, emails and tokens with digits.
    body.split(/\s+/).forEach((tok) => {
      if (/[@/\\]|https?:|\d/.test(tok) || /\.(js|ts|net|io|com|py|json|css|html)\b/i.test(tok)) return;
      if (/[a-z][,;][A-Za-z]/.test(tok) || /[a-z]\.[A-Z][a-z]/.test(tok))
        push({ type: "grammar", severity: "medium", line: n, text: clip(body), match: tok, message: `Missing space after punctuation in "${tok}".`, suggestion: "Add a space after the comma, semicolon or full stop." });
    });

    // Lower-case "i" as a pronoun is an error; capital I/my in longer lines is a style note.
    if (/(^|\s)i(\s|'|,)/.test(body))
      push({ type: "grammar", severity: "high", line: n, text: clip(body), message: "The pronoun 'I' should be capitalised.", suggestion: "Capitalise 'I' or, better, remove first-person pronouns." });
    else if (/\b(I|I'm|I've|my|myself)\b/.test(body) && wc >= 5)
      push({ type: "style", severity: "low", line: n, text: clip(body), message: "First-person pronouns are unusual on a resume.", suggestion: "Drop 'I' and 'my'; start with the action verb." });

    // a/an check: compares each "a"/"an" with the next word.
    const toks = body.split(/\s+/);
    toks.forEach((w, i) => {
      const next = (toks[i + 1] || "").replace(/[^A-Za-z]/g, "");
      if (!next) return;
      const acr = isAcronym(next);
      // wantsAn: true if the next word starts with a vowel sound. Acronyms use their letter names; exceptions cover words like "use" or "unit" ("a") and "hour" or "honest" ("an").
      const wantsAn = acr
        ? /^[AEFHILMNORSX]/.test(next) // acronyms are read letter by letter: "an API", "an SQL", "a CSS"
        : /^[aeiou]/i.test(next) && !/^(use|usu|uni|util|eu|one|once|ubi|uk|ui)/i.test(next) || /^(hour|honest|honor|honour|heir)/i.test(next);
      if (/^a$/i.test(w) && wantsAn)
        push({ type: "grammar", severity: "medium", line: n, text: clip(body), match: `${w} ${next}`, message: `Use "an" before "${next}".`, suggestion: `"an ${next}"` });
      if (/^an$/i.test(w) && !wantsAn)
        push({ type: "grammar", severity: "medium", line: n, text: clip(body), match: `${w} ${next}`, message: `Use "a" before "${next}".`, suggestion: `"a ${next}"` });
    });

    // Known misspellings from the MISSPELLINGS list.
    words(body).forEach((w) => {
      if (MISSPELLINGS[w]) push({ type: "grammar", severity: "high", line: n, text: clip(body), match: w, message: `Possible misspelling: "${w}".`, suggestion: `Did you mean "${MISSPELLINGS[w]}"?` });
    });

    if (isBullet && /^[a-z]/.test(body))
      push({ type: "grammar", severity: "low", line: n, text: clip(body), message: "Bullet starts with a lowercase letter.", suggestion: "Capitalise the first word." });

    // Bullets over 35 words are too long.
    if (isBullet && wc > 35)
      push({ type: "style", severity: "low", line: n, text: clip(body), message: `Long bullet (${wc} words).`, suggestion: "Split into two bullets or cut to one clear achievement (aim for under 25 words)." });
  });

  // ---- bullet-level aggregates ----
  // If there are at least 3 real bullets, aggregate checks use only those; otherwise use all candidate lines.
  const real = bullets.filter((b) => b.isBullet);
  const pool = real.length >= 3 ? real : bullets;

  // repeated opening verbs
  const openers = {};
  pool.forEach((b) => {
    const w = (b.body.match(/^[A-Za-z]+/) || [""])[0].toLowerCase();
    if (w.length > 2) (openers[w] = openers[w] || []).push(b.n);
  });
  // Three or more bullets starting with the same word is repetitive.
  Object.entries(openers).forEach(([w, ls]) => {
    if (ls.length >= 3 && !STOP.has(w)) {
      const alts = SYNONYMS[w];
      push({
        type: "repetition", severity: "medium", line: ls[0], text: `${ls.length} bullets start with "${w}" (lines ${ls.slice(0, 5).join(", ")})`,
        message: `"${w}" opens ${ls.length} bullets.`,
        suggestion: alts ? `Vary the openers: ${alts.join(", ")}.` : "Vary the opening verbs across bullets.",
      });
    }
  });

  // duplicate bullets
  const seen = {};
  pool.forEach((b) => {
    // Normalise bullet text; ignore short ones (under 25 chars) when looking for exact duplicates.
    const k = b.body.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (k.length < 25) return;
    if (seen[k]) push({ type: "repetition", severity: "high", line: b.n, text: clip(b.body), message: `Duplicate of line ${seen[k]}.`, suggestion: "Remove or rewrite the repeated bullet." });
    else seen[k] = b.n;
  });

  // overused words
  // Ignore words that are part of detected skill names (e.g. "node").
  const skillSet = new Set(extractSkills(text).flatMap((s) => s.split(/\s+/)));
  const freq = {};
  words(text).forEach((w) => { if (w.length >= 5 && !STOP.has(w) && !skillSet.has(w)) freq[w] = (freq[w] || 0) + 1; });
  Object.entries(freq)
    // A word (5+ letters) used 6 or more times is overused; report the top 5.
    .filter(([, c]) => c >= 6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([w, c]) => push({ type: "repetition", severity: "low", line: 0, text: `"${w}" appears ${c} times`, message: `Overused word: "${w}" (${c}×).`, suggestion: "Replace some occurrences with synonyms or more specific terms." }));

  // trailing punctuation consistency
  const withDot = pool.filter((b) => /[.]$/.test(b.body)).length;
  const withoutDot = pool.length - withDot;
  // Flag only when both styles are mixed in at least 25% of 6+ bullets.
  if (pool.length >= 6 && Math.min(withDot, withoutDot) / pool.length >= 0.25)
    push({ type: "style", severity: "low", line: 0, text: `${withDot} bullets end with a full stop, ${withoutDot} do not`, message: "Inconsistent end punctuation across bullets.", suggestion: "Pick one style (usually no full stop) and apply it everywhere." });

  // bullets with no measurable result
  const noNumbers = pool.filter((b) => b.isBullet && !/\d/.test(b.body));
  // Flag if at least half of 4+ real bullets contain no digits.
  if (real.length >= 4 && noNumbers.length / real.length >= 0.5)
    push({ type: "vague", severity: "medium", line: noNumbers[0].n, text: `${noNumbers.length} of ${real.length} bullets contain no numbers`, message: "Most bullets lack a measurable result.", suggestion: "Add scale or impact: %, time saved, users, revenue, team size." });

  return finalize(dedupe(issues));
}

// Removes duplicate issues (same type, line and match/message).
function dedupe(issues) {
  const seen = new Set();
  return issues.filter((i) => {
    const k = `${i.type}|${i.line}|${i.match || i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Sorts issues by severity then line number, computes the score (100 minus penalties: high 6, medium 3, low 1, min 0),
// counts per type and keeps at most the first 80 issues.
function finalize(issues) {
  const sorted = [...issues].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]) || a.line - b.line);
  const penalty = sorted.reduce((s, i) => s + { high: 6, medium: 3, low: 1 }[i.severity], 0);
  const counts = sorted.reduce((c, i) => ((c[i.type] = (c[i.type] || 0) + 1), c), {});
  return { score: Math.max(0, 100 - penalty), counts, total: sorted.length, issues: sorted.slice(0, 80) };
}

module.exports = { checkGrammar, finalize, dedupe };
