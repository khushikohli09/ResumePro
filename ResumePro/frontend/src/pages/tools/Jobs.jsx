// Job recommendations tool: suggests roles that fit the skills and experience found in a resume.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Route as RouteIcon } from "lucide-react";
import toast from "react-hot-toast";
import ToolShell, { RunButton, AiNote } from "../../components/ToolShell";
import ResumePicker, { usePicker, pickerPayload, pickerReady } from "../../components/ResumePicker";
import Card from "../../components/Card";
import KeywordChips from "../../components/KeywordChips";
import MarkedList from "../../components/MarkedList";
import ScoreBar from "../../components/ScoreBar";
import { getJobRecommendations } from "../../api/tools";

// The job recommendations page component.
export default function Jobs() {
  // Resume source (saved resume or pasted text).
  const [input, setInput] = usePicker();
  // True while the request is running.
  const [busy, setBusy] = useState(false);
  // The backend's recommendations (profile and roles); null until loaded.
  const [r, setR] = useState(null);

  // Runs when the user clicks the recommend button.
  const run = async () => {
    setBusy(true);
    try {
      // API call: ask the backend for role recommendations.
      setR(await getJobRecommendations(pickerPayload(input)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate recommendations");
    } finally {
      setBusy(false);
    }
  };

  // Builds a link to the Roadmap tool for a role; the role name is URL-encoded and the saved resume id is added when one is selected.
  const roadmapLink = (role) => `/tools/roadmap?role=${encodeURIComponent(role)}${input.mode === "saved" && input.resumeId ? `&resume=${input.resumeId}` : ""}`;

  return (
    <ToolShell eyebrow="Career fit" title="Job recommendations" description="Roles that match the skills, education, projects and experience in your resume, with an honest score for each." wide>
      {/* Input area: picker and run button. */}
      <div className="mx-auto max-w-4xl space-y-6">
        <ResumePicker value={input} onChange={setInput} />
        <RunButton onClick={run} busy={busy} disabled={!pickerReady(input)} idle="Recommend roles" working="Analysing…" icon={Briefcase} />
      </div>

      {/* Only show results once they exist. */}
      {r && (
        <>
          {/* Profile summary: detected skills, years of experience, projects and education. */}
          <Card eyebrow="What we found" title="Your profile">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-medium text-(--color-muted)">Skills detected ({r.profile.skills.length})</p>
                {r.profile.skills.length ? <KeywordChips keywords={r.profile.skills} variant="matched" /> : <p className="text-sm text-(--color-muted)">No known skills detected. Add a Skills section for better results.</p>}
              </div>
              <dl className="space-y-1 font-mono text-xs text-(--color-muted)">
                <div>Experience: <span className="text-(--color-ink)">~{r.profile.yearsExperience} yrs</span></div>
                <div>Projects: <span className="text-(--color-ink)">{r.profile.projectsCount}</span></div>
                {r.profile.education[0] && <div>Education: <span className="text-(--color-ink)">{r.profile.education[0]}</span></div>}
              </dl>
            </div>
            <div className="mt-3"><AiNote aiUsed={r.aiUsed} /></div>
          </Card>

          {/* Grid of recommended roles. */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* One card per role with its match score, skills, next step and a roadmap link. */}
            {r.roles.map((role) => (
              <Card key={role.role} eyebrow={`${role.level} level`} title={role.role}>
                <ScoreBar label="Match" value={role.matchScore} />
                {role.why.length > 0 && <div className="mt-4"><MarkedList items={role.why} variant="add" /></div>}
                {role.matchedSkills.length > 0 && <div className="mt-4"><p className="mb-1 text-xs text-(--color-muted)">You have</p><KeywordChips keywords={role.matchedSkills} variant="matched" /></div>}
                {role.missingSkills.length > 0 && <div className="mt-3"><p className="mb-1 text-xs text-(--color-muted)">To learn</p><KeywordChips keywords={role.missingSkills} variant="missing" /></div>}
                {role.nextStep && <p className="mt-4 text-sm"><span className="font-medium">Next step:</span> <span className="text-(--color-muted)">{role.nextStep}</span></p>}
                <Link to={roadmapLink(role.role)} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-(--color-line) px-3 py-1.5 text-xs font-medium hover:border-(--color-accent) hover:text-(--color-accent)">
                  <RouteIcon size={13} /> Build a roadmap for this role
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}
    </ToolShell>
  );
}
