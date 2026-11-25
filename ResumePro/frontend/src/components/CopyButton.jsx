// Small button that copies the given text to the clipboard and shows a toast message.
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

// `text` is what gets copied; `label` is the button text (defaults to "Copy").
export default function CopyButton({ text, label = "Copy" }) {
  // On click: write to the clipboard, then show a success toast (first function) or an error toast (second function).
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Copied"), () => toast.error("Copy failed"))}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-(--color-line) px-2.5 py-1 text-xs hover:border-(--color-accent) hover:text-(--color-accent)"
    >
      <Copy size={12} /> {label}
    </button>
  );
}
