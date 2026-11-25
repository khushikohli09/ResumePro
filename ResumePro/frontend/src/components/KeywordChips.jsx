// Displays a list of keywords as small pill-shaped chips.
// `variant` "matched" gives accent-colored chips; any other value gives neutral (missing) chips.
export default function KeywordChips({ keywords = [], variant = "matched" }) {
  // Nothing to show: print a friendly message instead of an empty box.
  if (!keywords.length) {
    return <p className="text-sm text-(--color-muted)">None found.</p>;
  }
  // Decides which style to use for the chips.
  const isMatched = variant === "matched";
  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw) => (
        <span
          key={kw}
          className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
            isMatched
              ? "border-(--color-accent) text-(--color-accent) bg-(--color-accent)/10 font-medium"
              : "border-(--color-line) text-(--color-ink) bg-(--color-surface-2)"
          }`}
        >
          {kw}
        </span>
      ))}
    </div>
  );
}
