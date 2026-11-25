// Simple spinning loader with a text label, shown while data is loading.
export default function Loader({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-(--color-muted)">
      {/* The spinning circle (CSS animation via Tailwind's `animate-spin`). */}
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--color-line) border-t-(--color-accent)" />
      <p className="font-mono text-xs uppercase tracking-wider">{label}</p>
    </div>
  );
}
