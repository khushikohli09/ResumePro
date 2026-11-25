// Reusable white "paper" card with an optional small label (eyebrow), a title and an action slot (e.g. a button).
// `children` is whatever is placed between <Card> and </Card>; `className` lets callers add extra styles.
export default function Card({ eyebrow, title, action, children, className = "" }) {
  return (
    <div className={`paper-card rounded-2xl p-6 ${className}`}>
      {/* Only draw the header row if at least one of eyebrow, title or action was provided. */}
      {(eyebrow || title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-accent)">
                {eyebrow}
              </p>
            )}
            {title && <h3 className="mt-1 font-display text-lg font-semibold">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
