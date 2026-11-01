import { useRef, useState } from "react";
import { Camera, FileText, ImagePlus, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import CameraCapture from "./CameraCapture.jsx";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_MB = 8;

export default function UploadPanel({
  text,
  onTextChange,
  file,
  preview,
  onFile,
  onClearFile,
  onSubmit,
  loading,
}) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  const accept = (f) => {
    if (!f) return;
    if (!TYPES.includes(f.type)) return setError("Please upload a PNG, JPG, JPEG, or WEBP image.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Image must be under ${MAX_MB} MB.`);
    setError("");
    onFile(f);
  };

  const hasContent = Boolean(file || (text && text.trim().length > 0));

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (hasContent && !loading) {
        onSubmit();
      }
    }
  };

  return (
    <section id="upload" className="mx-auto max-w-3xl">
      {/* Unified AI Prompt & Media Card */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files?.[0]); }}
        className={`glass relative rounded-2xl sm:rounded-3xl border transition-all duration-200 shadow-2xl ${
          drag
            ? "border-sky-400 bg-sky-950/40 ring-4 ring-sky-400/20"
            : "border-white/15 bg-navy-900/60 focus-within:border-sky-400/60 focus-within:ring-2 focus-within:ring-sky-400/20"
        }`}
      >
        {/* Text Input Area */}
        <div className="p-4 sm:p-5 pb-2">
          <textarea
            ref={textareaRef}
            id="question-text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={3}
            placeholder="Type or paste your question, math problem, or prompt here..."
            className="w-full resize-none bg-transparent text-sm sm:text-base text-white placeholder-slate-400 outline-none disabled:opacity-50"
          />
        </div>

        {/* Attached Image Chip (if any) */}
        {preview && (
          <div className="mx-4 sm:mx-5 mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-black/40 p-2 sm:p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/60">
                <img src={preview} alt="Attached question" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-400">
                  <UploadCloud className="h-3 w-3" />
                  <span>Image Attached</span>
                </div>
                <p className="truncate text-xs sm:text-sm font-medium text-white">{file?.name || "Uploaded Image"}</p>
                <p className="text-[11px] text-slate-400">{file ? (file.size / 1024).toFixed(0) + " KB" : ""}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearFile}
              disabled={loading}
              aria-label="Remove image"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bottom Integrated Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/10 px-4 py-3 sm:px-5">
          {/* Left Media Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-300 disabled:opacity-50"
              title="Snap a photo of your question"
            >
              <Camera className="h-3.5 w-3.5 text-sky-400" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-violet-300 disabled:opacity-50"
              title="Upload image file"
            >
              <ImagePlus className="h-3.5 w-3.5 text-violet-400" />
              <span>Attach Image</span>
            </button>

            <span className="hidden sm:inline text-[11px] text-slate-500">
              or drop image here
            </span>
          </div>

          {/* Right Action: Shortcut Hint & Submit Button */}
          <div className="flex items-center gap-3 ml-auto">
            <span className="hidden md:inline text-[11px] text-slate-400">
              <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">Ctrl</kbd> + <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">Enter</kbd>
            </span>

            <button
              type="button"
              onClick={onSubmit}
              disabled={!hasContent || loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-950/50 transition enabled:hover:brightness-110 enabled:hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{loading ? "Solving..." : "Generate Answers"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        hidden
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
      />

      {/* Error alert */}
      {error && (
        <p role="alert" className="mt-2.5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs text-rose-300">
          {error}
        </p>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={accept}
          onClose={() => setShowCamera(false)}
        />
      )}
    </section>
  );
}
