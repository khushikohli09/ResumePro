// A small, transparent role/skill catalogue. It powers the deterministic
// fallbacks for job recommendations and skill-gap analysis, and it grounds the
// LLM prompts so the model compares against a known baseline.

// Each role with the skills typically expected for it (all lower-case).
const ROLES = [
  { title: "Frontend Developer", skills: ["html", "css", "javascript", "typescript", "react", "redux", "tailwind css", "responsive design", "git", "rest apis", "testing", "accessibility", "next.js"] },
  { title: "Backend Developer", skills: ["node.js", "express", "python", "java", "sql", "mongodb", "postgresql", "rest apis", "docker", "git", "authentication", "redis", "microservices", "testing"] },
  { title: "Full Stack Developer", skills: ["javascript", "typescript", "react", "node.js", "express", "mongodb", "sql", "rest apis", "git", "docker", "html", "css", "authentication", "ci/cd"] },
  { title: "Data Analyst", skills: ["sql", "excel", "python", "pandas", "tableau", "power bi", "statistics", "data visualization", "data cleaning", "numpy"] },
  { title: "Data Scientist", skills: ["python", "machine learning", "statistics", "pandas", "numpy", "scikit-learn", "sql", "data visualization", "deep learning", "tensorflow", "feature engineering"] },
  { title: "Machine Learning Engineer", skills: ["python", "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "docker", "mlops", "sql", "nlp", "git", "aws"] },
  { title: "DevOps Engineer", skills: ["linux", "docker", "kubernetes", "ci/cd", "aws", "terraform", "git", "bash", "jenkins", "monitoring", "ansible", "networking"] },
  { title: "Cloud Engineer", skills: ["aws", "azure", "gcp", "terraform", "linux", "docker", "kubernetes", "networking", "ci/cd", "python"] },
  { title: "Mobile App Developer", skills: ["react native", "flutter", "dart", "kotlin", "swift", "android", "ios", "rest apis", "firebase", "git"] },
  { title: "QA / Test Engineer", skills: ["manual testing", "test automation", "selenium", "cypress", "api testing", "postman", "jira", "sql", "git", "agile"] },
  { title: "Cybersecurity Analyst", skills: ["network security", "linux", "siem", "penetration testing", "owasp", "python", "incident response", "cryptography", "firewalls"] },
  { title: "UI/UX Designer", skills: ["figma", "user research", "wireframing", "prototyping", "design systems", "usability testing", "adobe xd", "html", "css"] },
  { title: "Product Manager", skills: ["product roadmap", "agile", "user stories", "stakeholder management", "analytics", "sql", "market research", "jira", "prioritization", "communication"] },
  { title: "Business Analyst", skills: ["requirements gathering", "sql", "excel", "power bi", "stakeholder management", "process mapping", "agile", "jira", "documentation", "communication"] },
  { title: "Digital Marketing Specialist", skills: ["seo", "google analytics", "content marketing", "social media marketing", "email marketing", "google ads", "copywriting", "a/b testing", "crm"] },
];

// canonical skill -> alternative spellings found in real resumes
// An alias found in a resume counts as the canonical skill.
const ALIASES = {
  javascript: ["js", "es6", "ecmascript"],
  typescript: ["ts"],
  "node.js": ["nodejs", "node"],
  react: ["react.js", "reactjs"],
  "next.js": ["nextjs"],
  mongodb: ["mongo", "mongoose"],
  postgresql: ["postgres"],
  "rest apis": ["rest api", "restful", "restful apis", "rest"],
  "machine learning": ["ml"],
  "deep learning": ["neural networks"],
  "ci/cd": ["cicd", "github actions", "gitlab ci", "jenkins"],
  "tailwind css": ["tailwind"],
  "scikit-learn": ["sklearn"],
  "power bi": ["powerbi"],
  "data visualization": ["data visualisation", "matplotlib", "seaborn"],
  nlp: ["natural language processing"],
  aws: ["amazon web services", "ec2", "s3"],
  gcp: ["google cloud"],
  kubernetes: ["k8s"],
  "react native": [],
  "test automation": ["automation testing", "automated testing"],
  testing: ["unit testing", "jest", "mocha", "junit"],
  "user research": ["ux research"],
  "stakeholder management": ["stakeholder communication"],
  seo: ["search engine optimization"],
  "google analytics": ["ga4"],
  authentication: ["jwt", "oauth", "auth"],
  "responsive design": ["responsive"],
  accessibility: ["a11y", "wcag"],
  microservices: ["micro-services"],
};

// Additional skills we want to detect even though they aren't tied to a role above.
const EXTRA_SKILLS = ["c++", "c#", "go", "rust", "php", "ruby", "graphql", "mysql", "firebase", "kafka", "spark", "hadoop", "sass", "bootstrap", "vue", "angular", "django", "flask", "spring boot", "rest", "agile", "scrum", "leadership", "communication", "problem solving", "excel", "photoshop", "illustrator", "sales", "negotiation", "project management", "r", "matlab", "opencv", "langchain", "llm", "prompt engineering", "websockets", "linux"];

// Full list of detectable skills (duplicates removed).
const VOCAB = Array.from(
  new Set([...ROLES.flatMap((r) => r.skills), ...Object.keys(ALIASES), ...EXTRA_SKILLS])
).filter((s) => s !== "r" && s !== "go" && s !== "rest");
// "r", "go" and "rest" are too ambiguous to detect by plain text matching.

// Escapes characters that have special meaning in regular expressions so skill names like "c++" or "node.js" match literally.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// Pre-build one regex per skill. The lookbehind/lookahead (?<![a-z0-9+#]) and (?![a-z0-9+#]) make sure the skill is a whole word,
// e.g. "java" will not match inside "javascript". Flag "i" makes it case-insensitive.
const MATCHERS = VOCAB.map((skill) => {
  const forms = [skill, ...(ALIASES[skill] || [])].map(esc).join("|");
  return { skill, re: new RegExp(`(?<![a-z0-9+#])(?:${forms})(?![a-z0-9+#])`, "i") };
});

// Returns the list of canonical skills found in the text.
function extractSkills(text = "") {
  return MATCHERS.filter((m) => m.re.test(text)).map((m) => m.skill);
}

// Compares a list of skills against every role. Returns the top roles (default 6) sorted by matchScore,
// which is the percentage of that role's skills the person has, plus matched and missing skills.
function matchRoles(skills, { top = 6 } = {}) {
  const have = new Set(skills);
  return ROLES.map((role) => {
    const matched = role.skills.filter((s) => have.has(s));
    const missing = role.skills.filter((s) => !have.has(s));
    return {
      role: role.title,
      matchScore: Math.round((matched.length / role.skills.length) * 100),
      matchedSkills: matched,
      missingSkills: missing,
    };
  })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, top);
}

// Finds the role that best fits a free-text query such as "senior react dev". Returns a role object or null.
function findRole(query = "") {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  // First try an exact title match.
  const exact = ROLES.find((r) => r.title.toLowerCase() === q);
  if (exact) return exact;
  // Otherwise ignore generic words, shorten the remaining words to 5-letter stems and count how many appear in each title;
  // the role with the most stem hits wins.
  const generic = new Set(["developer", "engineer", "specialist", "senior", "junior", "lead", "intern", "dev", "and", "the"]);
  const stems = q.split(/[^a-z]+/).filter((w) => w.length > 2 && !generic.has(w)).map((w) => w.slice(0, 5));
  let best = null;
  let bestScore = 0;
  for (const role of ROLES) {
    const title = role.title.toLowerCase();
    const score = stems.filter((st) => title.includes(st)).length;
    if (score > bestScore) { best = role; bestScore = score; }
  }
  return best;
}

// (See the comment below.) Takes missing skills, a target role name and study hours per week, and returns an array of phases.
// Deterministic roadmap used when the LLM is unavailable: missing skills are
// chunked into phases, foundations first, then a capstone + interview phase.
function fallbackRoadmap(missing, targetRole, hoursPerWeek = 10) {
  // Fewer weekly hours means more weeks per skill: 15+ hours = 1 week, 8-14 hours = 2 weeks, otherwise 3 weeks.
  const perSkillWeeks = hoursPerWeek >= 15 ? 1 : hoursPerWeek >= 8 ? 2 : 3;
  // Group the missing skills into chunks of 3; at most 4 chunks become learning phases.
  const chunks = [];
  for (let i = 0; i < missing.length; i += 3) chunks.push(missing.slice(i, i + 3));
  const phases = chunks.slice(0, 4).map((skills, i) => ({
    phase: i + 1,
    title: i === 0 ? "Close the biggest gaps" : `Build depth, part ${i + 1}`,
    // Each phase lasts at least 2 weeks.
    weeks: Math.max(2, skills.length * perSkillWeeks),
    goals: skills.map((s) => `Be able to use ${s} on a real task without a tutorial`),
    topics: skills,
    project: `Build a small project for your ${targetRole} portfolio that uses ${skills.join(", ")}.`,
    resources: ["Official documentation", "One structured beginner course", "A hands-on practice repo"],
  }));
  // Always finish with a final phase for portfolio and interview preparation.
  phases.push({
    phase: phases.length + 1,
    title: "Portfolio & interview prep",
    weeks: 2,
    goals: ["Publish your projects with clear READMEs", "Update your resume with the new skills and quantified results", "Practice role-specific interview questions"],
    topics: ["Resume update", "Portfolio polish", "Mock interviews"],
    project: `Pick your strongest project and write a short case study explaining decisions and results.`,
    resources: ["Your own project write-ups", "Mock interviews with a friend"],
  });
  return phases;
}

module.exports = { ROLES, extractSkills, matchRoles, findRole, fallbackRoadmap };
