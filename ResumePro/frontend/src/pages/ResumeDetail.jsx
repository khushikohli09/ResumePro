// Detail page for one saved resume: shows its analysis (uploaded) or preview (built), plus links to the AI tools.
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getResume, rematchAgainstJob } from "../api/resume";
import AnalysisResult from "../components/AnalysisResult";
import ResumePreview from "../templates/ResumePreview";
import Loader from "../components/Loader";
import Card from "../components/Card";
import { Pencil } from "lucide-react";

// Slug (URL part) and label for each tool link shown at the top of the page.
const TOOL_LINKS = [["grammar", "Grammar"], ["authenticity", "Authenticity"], ["linkedin", "LinkedIn"], ["jobs", "Job matches"], ["roadmap", "Roadmap"], ["portfolio", "Portfolio"]];

// The resume detail page component.
export default function ResumeDetail() {
  // Reads the resume id from the URL (/resume/:id).
  const { id } = useParams();
  // The resume: `null` = still loading, `false` = not found or failed, otherwise the resume object.
  const [resume, setResume] = useState(null);
  // Text of a job description the user pastes to re-run the match.
  const [jobDescription, setJobDescription] = useState("");
  // True while the re-analysis request is running.
  const [rematching, setRematching] = useState(false);

  // Fetches the resume from the API; on error marks it as not found.
  const load = () => getResume(id).then(setResume).catch(() => setResume(false));

  // Load the resume on first render and again whenever the id in the URL changes.
  useEffect(() => {
    load();
  }, [id]);

  // Runs when the user clicks Re-analyze.
  const onRematch = async () => {
    setRematching(true);
    try {
      // API call: re-compares the resume with the pasted job description and returns the updated resume.
      const updated = await rematchAgainstJob(id, jobDescription);
      setResume(updated);
      toast.success("Re-analyzed against job description");
    } catch {
      toast.error("Re-analysis failed");
    } finally {
      setRematching(false);
    }
  };

  // Still loading.
  if (resume === null) return <Loader label="Loading resume" />;
  // Failed to load: show a not-found message.
  if (resume === false) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-(--color-muted)">Resume not found.</p>
        <Link to="/dashboard" className="mt-4 inline-block text-(--color-accent) font-medium">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-(--color-accent)">
        {resume.source === "builder" ? "Built resume" : "Uploaded resume"}
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold">{resume.title}</h1>

      {/* Action links: edit in builder (built resumes only) and one link per AI tool, passing the resume id in the query string. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {resume.source === "builder" && (
          <Link to={`/builder/${resume._id}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-(--color-accent-ink) hover:opacity-90"><Pencil size={13} /> Edit in builder</Link>
        )}
        {TOOL_LINKS.map(([slug, label]) => (
          <Link key={slug} to={`/tools/${slug}?resume=${resume._id}`} className="rounded-full border border-(--color-line) px-3 py-1.5 text-xs font-medium hover:border-(--color-accent) hover:text-(--color-accent)">{label}</Link>
        ))}
      </div>

      {/* Built resumes show a rendered preview; uploaded ones show the re-match form and the analysis. */}
      {resume.source === "builder" ? (
        <div className="mt-8">
          <ResumePreview data={resume.builderData} />
        </div>
      ) : (
        <>
          {/* Form to re-run the keyword match against another job description. */}
          <Card eyebrow="Re-run" title="Match against a different job description" className="mt-8">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={5}
              placeholder="Paste a job description…"
              className="w-full rounded-xl border border-(--color-line) bg-(--color-surface-2) p-3 text-sm outline-none focus:border-(--color-accent)"
            />
            <button
              onClick={onRematch}
              disabled={rematching || !jobDescription.trim()}
              className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-medium text-(--color-accent-ink) hover:opacity-90 disabled:opacity-40"
            >
              {rematching ? "Re-analyzing…" : "Re-analyze"}
            </button>
          </Card>

          {/* Full analysis (scores, keywords, strengths, etc.). */}
          <div className="mt-8">
            <AnalysisResult resume={resume} />
          </div>
        </>
      )}
    </div>
  );
}
