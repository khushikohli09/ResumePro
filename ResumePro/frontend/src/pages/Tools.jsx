// Tools hub page: a grid of cards linking to each AI tool (grammar, authenticity, LinkedIn, jobs, roadmap, portfolio).
import { Link } from "react-router-dom";
import { pick } from "../palette";
import { SpellCheck, ShieldCheck, UserRound, Briefcase, Route, Globe, ArrowUpRight } from "lucide-react";

// Data for the cards: where each links to, its icon, title and description. Edit this list to add or remove a tool.
const TOOLS = [
  { to: "/tools/grammar", icon: SpellCheck, title: "Grammar & Wording Checker", body: "Finds grammar errors, weak verbs, repetition and vague statements, with a concrete fix for each." },
  { to: "/tools/authenticity", icon: ShieldCheck, title: "Authenticity Checker", body: "Flags date gaps and overlaps, inflated claims, copied text and keyword stuffing a recruiter would question." },
  { to: "/tools/linkedin", icon: UserRound, title: "LinkedIn Suggestions", body: "Optimised headlines, an About section and experience descriptions built from your resume." },
  { to: "/tools/jobs", icon: Briefcase, title: "Job Recommendations", body: "Roles that fit your skills, education, projects and experience, with an honest match score." },
  { to: "/tools/roadmap", icon: Route, title: "Skill Gap & Roadmap", body: "Compare your skills with a role or job description and get a phased learning plan." },
  { to: "/tools/portfolio", icon: Globe, title: "Portfolio Website Generator", body: "Turn your resume into a responsive, single-file portfolio site with light and dark themes." },
];

// Renders the heading and one clickable card per entry in TOOLS.
export default function Tools() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-(--color-accent)">AI toolkit</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Tools</h1>
      <p className="mt-2 max-w-2xl text-(--color-muted)">Every tool works on a saved resume (uploaded or built) or on text you paste.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Loop over TOOLS to create a card per tool; `key` helps React track list items, `pick(i)` cycles through theme colors. */}
        {TOOLS.map(({ to, icon: Icon, title, body }, i) => (
          <Link
            key={to}
            to={to}
            className="paper-card group rounded-2xl p-6 transition-all hover:border-(--color-accent) hover:shadow-[0_0_25px_rgba(0,91,179,0.2)]"
          >
            <div className="flex items-start justify-between">
              <Icon size={22} style={{ color: pick(i) }} />
              <ArrowUpRight size={16} className="text-(--color-muted) group-hover:text-(--color-accent)" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-(--color-muted)">{body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
