// Analyzer page: upload a resume file or paste text (optionally with a job description) and see the analysis.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FileSearch } from "lucide-react";
import UploadBox from "../components/UploadBox";
import AnalysisResult from "../components/AnalysisResult";
import Card from "../components/Card";
import Loader from "../components/Loader";
import { analyzeUpload, analyzeText } from "../api/resume";

// The analyzer page component.
export default function Analyzer() {
  // `navigate` is used to jump to the dashboard once finished.
  const navigate = useNavigate();
  // Which input method is active.
  const [mode, setMode] = useState("upload"); // "upload" | "paste"
  // The chosen file (upload mode).
  const [file, setFile] = useState(null);
  // The pasted resume text (paste mode).
  const [pastedText, setPastedText] = useState("");
  // Optional job description for the keyword match.
  const [jobDescription, setJobDescription] = useState("");
  // Upload progress percentage, shown while uploading.
  const [progress, setProgress] = useState(0);
  // True while the request is running.
  const [analyzing, setAnalyzing] = useState(false);
  // The analysis returned by the backend; null until an analysis has finished.
  const [result, setResult] = useState(null);

  // The Run button is enabled only with a file, or with at least 50 characters of pasted text.
  const canSubmit = mode === "upload" ? !!file : pastedText.trim().length >= 50;

  // Runs when the user clicks "Run analysis".
  const onAnalyze = async () => {
    setAnalyzing(true);
    setProgress(0);
    try {
      // API call: upload the file (reporting progress) or send the pasted text; either returns the saved resume with its analysis.
      const resume =
        mode === "upload"
          ? await analyzeUpload(file, jobDescription, setProgress)
          : await analyzeText(pastedText, jobDescription);
      setResult(resume);
      toast.success("Analysis complete");
    } catch (err) {
      // Show the server's error message if available.
      toast.error(err.response?.data?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // While analyzing, show only a loader.
  if (analyzing) return <Loader label={mode === "upload" ? `Uploading & analyzing ${progress}%` : "Analyzing"} />;

  // After analysis, show the results view instead of the form.
  if (result) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-(--color-accent)">Analysis complete</p>
            <h1 className="mt-1 font-display text-2xl font-semibold">{result.title}</h1>
          </div>
          <div className="flex gap-3">
            {/* Button to reset the page and analyze another resume. */}
            <button
              onClick={() => {
                // Clear the result and inputs to return to the form.
                setResult(null);
                setFile(null);
                setPastedText("");
              }}
              className="rounded-full border border-(--color-line) px-4 py-2 text-sm font-medium hover:border-(--color-accent) hover:text-(--color-accent)"
            >
              Analyze another
            </button>
            {/* Button to open the dashboard where the resume is saved. */}
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-(--color-accent-ink) hover:opacity-90"
            >
              Go to dashboard
            </button>
          </div>
        </div>
        <AnalysisResult resume={result} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-(--color-accent)">Analyzer</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Analyze your resume</h1>
      <p className="mt-2 text-(--color-muted)">
        Upload a file or paste your resume text. Add a job description to see how well you match it.
      </p>

      {/* Toggle between upload and paste modes. */}
      <div className="mt-6 inline-flex rounded-full border border-(--color-line) p-1">
        {["upload", "paste"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? "bg-brand text-(--color-accent-ink)" : "text-(--color-muted)"
            }`}
          >
            {m === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      {/* Input area for the resume: file upload box or text area. */}
      <div className="mt-6">
        {mode === "upload" ? (
          <UploadBox file={file} onFileSelected={setFile} />
        ) : (
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={12}
            placeholder="Paste your resume text here…"
            className="w-full rounded-2xl border border-(--color-line) bg-(--color-surface) p-4 text-sm outline-none focus:border-(--color-accent)"
          />
        )}
      </div>

      {/* Optional job description. */}
      <Card eyebrow="Optional" title="Target job description" className="mt-6">
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={6}
          placeholder="Paste a job description to get a keyword match score…"
          className="w-full rounded-xl border border-(--color-line) bg-(--color-surface-2) p-3 text-sm outline-none focus:border-(--color-accent)"
        />
      </Card>

      {/* Start the analysis. */}
      <button
        onClick={onAnalyze}
        disabled={!canSubmit}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-(--color-accent-ink) hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        <FileSearch size={16} /> Run analysis
      </button>
    </div>
  );
}
