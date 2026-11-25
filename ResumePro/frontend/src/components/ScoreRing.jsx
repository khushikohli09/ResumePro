// Circular progress ring (SVG) that animates in, with a counting-up number in the centre.
import { useCountUp } from "../hooks/useMotion";

// Picks a color for a score: green for 75+, amber for 50-74, red below 50.
export const scoreColor = (s) => {
  if (s >= 75) return "var(--color-good)";
  if (s >= 50) return "var(--color-warn)";
  return "var(--color-danger)";
};

// Circular progress ring that draws itself in, with a counting number in the middle.
// Props: score (0-100), size and stroke width in pixels, and `index` used to stagger animations in lists.
export default function ScoreRing({ score = 0, size = 64, stroke = 6, index = 0 }) {
  // Radius of the circle, reduced by the stroke so the line stays inside the box.
  const r = (size - stroke) / 2;
  // Circumference of the circle; the ring is drawn by hiding part of this length.
  const c = 2 * Math.PI * r;
  // Keep the score within 0-100.
  const clamped = Math.max(0, Math.min(100, score));
  // Animated number that counts up from 0 to the score; later items in a list start slightly later.
  const shown = useCountUp(Math.round(clamped), { delay: index * 70 + 150, duration: 1000 });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Score ${Math.round(clamped)} out of 100`}>
      {/* Rotated -90 degrees so the ring starts at the top instead of the right. */}
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track of the ring. */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        {/* Foreground arc: the CSS variables tell the stylesheet animation how long the line is and where it should end. */}
        <circle
          className="ring-fg"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={scoreColor(clamped)} strokeWidth={stroke} strokeLinecap="round"
          style={{ "--c": c, "--target": c * (1 - clamped / 100), "--i": index }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold text-(--color-ink)">{shown}</span>
    </div>
  );
}
