// Bulleted list where each item is styled like a marker ("add" = green addition, "remove" = red deletion).
export default function MarkedList({ items = [], variant = "add" }) {
  // Empty list: show a placeholder message.
  if (!items.length) {
    return <p className="text-sm text-(--color-muted)">Nothing to show.</p>;
  }
  // Pick the CSS class (defined in the global stylesheet) matching the variant.
  const markClass = variant === "add" ? "mark-add" : "mark-remove";
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        // The index is used as the key because items are plain strings that may repeat.
        <li key={i} className={`${markClass} text-sm leading-relaxed text-(--color-ink)`}>
          {item}
        </li>
      ))}
    </ul>
  );
}
