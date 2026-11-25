// Horizontal progress bar showing a score from 0 to 100 with a label and number.
// `value` defaults to 0 when the score is missing.
export default function ScoreBar({ label, value = 0 }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-(--color-muted)">{label}</span>
        <span className="font-mono text-xs text-(--color-ink)">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-(--color-surface-2)">
        {/* Bar width is the score clamped between 2% and 100%, so even a very low score stays visible. */}
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
