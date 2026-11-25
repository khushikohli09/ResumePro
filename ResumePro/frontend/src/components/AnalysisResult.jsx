// Shows the full result of a resume analysis: scores, keyword match, strengths, weaknesses and suggestions.
import ScoreStamp from "./ScoreStamp";
import ScoreBar from "./ScoreBar";
import KeywordChips from "./KeywordChips";
import MarkedList from "./MarkedList";
import Card from "./Card";

// Takes a `resume` object (as returned by the backend) and lays out each part of its analysis in cards.
export default function AnalysisResult({ resume }) {
  // `analysis` may be missing (e.g. not analyzed yet), so fall back to an empty object to avoid crashes.
  const a = resume.analysis || {};
  // Per-category scores (formatting, impact, clarity, keywords); also defaults to an empty object.
  const sections = a.sectionScores || {};

  return (
    <div className="space-y-6">
      {/* Top row: overall score on the left, section breakdown bars on the right. */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card eyebrow="Overall" className="flex flex-col items-center justify-center text-center">
          // `??` means "use the next value only if this one is null/undefined": overall score, else ATS score, else 0.
          <ScoreStamp score={a.overallScore ?? a.atsScore ?? 0} label="Overall score" />
        </Card>
        <Card eyebrow="ATS" title="Section breakdown" className="md:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <ScoreBar label="Formatting" value={sections.formatting} />
            <ScoreBar label="Impact" value={sections.impact} />
            <ScoreBar label="Clarity" value={sections.clarity} />
            <ScoreBar label="Keyword match" value={sections.keywords} />
          </div>
        </Card>
      </div>

      {/* Only show the job-match card if the user supplied a job description. */}
      {a.jobDescription ? (
        <Card eyebrow="Job match" title={`${a.matchScore ?? 0}% keyword overlap with the target role`}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-(--color-muted)">Matched keywords</p>
              <KeywordChips keywords={a.matchedKeywords} variant="matched" />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-(--color-muted)">Missing keywords</p>
              <KeywordChips keywords={a.missingKeywords} variant="missing" />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Strengths and weaknesses side by side. */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card eyebrow="Reviewed like a hiring manager" title="Strengths">
          <MarkedList items={a.strengths} variant="add" />
        </Card>
        <Card eyebrow="Reviewed like a hiring manager" title="Weaknesses">
          <MarkedList items={a.weaknesses} variant="remove" />
        </Card>
      </div>

      {/* Actionable suggestions from the review. */}
      <Card eyebrow="Actionable" title="Suggestions">
        <MarkedList items={a.suggestions} variant="add" />
      </Card>

      {/* Only show skill gaps when the list exists and has at least one item (`?.` avoids errors if it is undefined). */}
      {a.skillGaps?.length > 0 && (
        <Card eyebrow="Relative to your target role" title="Skill gaps">
          <div className="flex flex-wrap gap-2">
            {a.skillGaps.map((s) => (
              <span
                key={s}
                className="rounded-full border border-(--color-line) bg-(--color-surface-2) px-3 py-1 font-mono text-xs text-(--color-ink) font-medium"
              >
                {s}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
