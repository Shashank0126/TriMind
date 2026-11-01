import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Brain, Gem, Sparkles, Zap } from "lucide-react";
import UploadPanel from "./components/UploadPanel.jsx";
import AnswerCard from "./components/AnswerCard.jsx";
import { API_BASE, solveStream } from "./lib/stream.js";

const PROVIDERS = [
  { id: "gemini_flash", name: "Gemini 2.5 Flash", by: "Google (Fast)", Icon: Gem, gradient: "from-emerald-400 to-teal-500" },
  { id: "gemini", name: "Gemini (Reasoner)", by: "Google (Deep)", Icon: Brain, gradient: "from-sky-400 to-indigo-500" },
  { id: "groq", name: "Groq", by: "Groq (Qwen)", Icon: Zap, gradient: "from-orange-400 to-rose-500" },
];

export default function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState({});
  const [models, setModels] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/v1/models`).then((r) => setModels(r.data)).catch(() => {});
  }, []);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const generate = async () => {
    if ((!file && !text.trim()) || loading) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError("");
    setLoading(true);
    setResults(Object.fromEntries(PROVIDERS.map((p) => [p.id, { status: "loading" }])));

    // Smooth scroll to answers
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 150);

    try {
      await solveStream(
        { file, text },
        ({ provider, result }) => setResults((r) => ({ ...r, [provider]: result })),
        ctrl.signal
      );
      // Anything that never reported back is treated as failed.
      setResults((r) =>
        Object.fromEntries(
          PROVIDERS.map((p) => [
            p.id,
            r[p.id]?.status === "loading" ? { status: "error", error: "No response received." } : r[p.id],
          ])
        )
      );
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message || "Could not reach the server.");
      setResults({});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <a href="#upload" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow-md shadow-sky-500/20">
              <Brain className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">TriMind AI</span>
          </a>
          <nav className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-slate-300">
            <a href="#upload" className="transition hover:text-white">Ask</a>
            <a href="#results" className="transition hover:text-white">Answers</a>
          </nav>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-20 pt-6 sm:pt-8">
        {/* Sleek Balanced Hero */}
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 py-1 text-xs font-medium text-sky-300">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            <span>Multimodal: Text, Images, & Live Camera</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
            One question, three independent answers
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Type a problem or snap a picture. Gemini Flash, Gemini Reasoner, and Groq solve it simultaneously.
          </p>
        </div>

        {/* Unified Input Prompt Panel */}
        <UploadPanel
          text={text}
          onTextChange={setText}
          file={file}
          preview={preview}
          onFile={pick}
          onClearFile={clearFile}
          onSubmit={generate}
          loading={loading}
        />

        {/* Global Error Banner */}
        {error && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-3xl rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs sm:text-sm text-rose-200"
          >
            {error}
          </p>
        )}

        {/* Three Answer Cards Grid */}
        <section id="results" className="mt-10">
          <div className="mb-4 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Independent Solutions</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">3 AI Minds</span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3 items-stretch">
            {PROVIDERS.map((p) => (
              <AnswerCard key={p.id} provider={p} model={models[p.id]} result={results[p.id]} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
