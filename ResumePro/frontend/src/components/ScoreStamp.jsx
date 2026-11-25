// Large round "stamp" showing a score number with a caption, colored by how good the score is.
// Returns a color for a score: green for 75+, amber for 50-74, red below 50.
function colorFor(score) {
  if (score >= 75) return "var(--color-good)";
  if (score >= 50) return "var(--color-warn)";
  return "var(--color-danger)";
}

// Props: the score, a caption label and the size in pixels.
export default function ScoreStamp({ score = 0, label = "ATS Score", size = 128 }) {
  // Pick the color once so the number uses it.
  const color = colorFor(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="score-stamp"
        style={{
          width: size,
          height: size,
          color,
          // Font size scales with the stamp size.
          fontSize: size * 0.32,
          filter: "drop-shadow(0 0 10px rgba(0, 91, 179, 0.25))",
        }}
      >
        {Math.round(score)}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-widest text-(--color-muted)">
        {label}
      </span>
    </div>
  );
}
