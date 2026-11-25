// File upload area supporting drag-and-drop or click-to-browse, for resume files.
import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

// File extensions we allow.
const ACCEPTED = [".pdf", ".doc", ".docx"];

// `file` is the currently selected file (or null); `onFileSelected` tells the parent when it changes.
export default function UploadBox({ file, onFileSelected }) {
  // True while a file is being dragged over the box (used for highlighting).
  const [dragging, setDragging] = useState(false);
  // Reference to the hidden <input type="file"> so we can open it programmatically.
  const inputRef = useRef(null);

  // Checks the file's type and size, then passes it to the parent. useCallback keeps the function stable between renders.
  const validateAndSet = useCallback(
    (f) => {
      // Ignore empty selections.
      if (!f) return;
      // Get the extension, e.g. ".pdf", from the file name.
      const ext = "." + f.name.split(".").pop().toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        alert(`Unsupported file type. Please upload one of: ${ACCEPTED.join(", ")}`);
        return;
      }
      // Limit to 8 MB (8 * 1024 * 1024 bytes).
      if (f.size > 8 * 1024 * 1024) {
        alert("File is too large. Max size is 8MB.");
        return;
      }
      onFileSelected(f);
    },
    [onFileSelected]
  );

  // Runs when a file is dropped: stop the browser opening the file, then validate the first dropped file.
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    validateAndSet(e.dataTransfer.files?.[0]);
  };

  // A file is already chosen: show its name and size with a remove button instead of the drop area.
  if (file) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-(--color-line) bg-(--color-surface) px-5 py-4">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-(--color-accent)" />
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="font-mono text-xs text-(--color-muted)">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
        {/* Removing the file tells the parent there is now no file. */}
        <button
          onClick={() => onFileSelected(null)}
          aria-label="Remove file"
          className="rounded-full p-1.5 text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-accent)"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // Drop area: click or press Enter to open the hidden file picker; dragging a file over it highlights the box.
  return (
    <div
      // preventDefault is required, otherwise the browser will not allow dropping here.
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        dragging
          ? "border-(--color-accent) bg-(--color-surface-2)"
          : "border-(--color-line) bg-(--color-surface) hover:border-(--color-accent)"
      }`}
    >
      <UploadCloud size={28} className="text-(--color-muted)" />
      <div>
        <p className="text-sm font-medium">Drop your resume here, or click to browse</p>
        <p className="mt-1 font-mono text-xs text-(--color-muted)">PDF, DOC or DOCX · up to 8MB</p>
      </div>
      {/* Hidden native file input; the styled box above triggers it. */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => validateAndSet(e.target.files?.[0])}
      />
    </div>
  );
}
