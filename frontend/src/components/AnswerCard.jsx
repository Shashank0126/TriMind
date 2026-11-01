import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { AlertTriangle, Check, Clock, Copy, Loader2 } from "lucide-react";

// Sanitize first; KaTeX and highlight.js run afterwards so their generated markup is not stripped.
const REHYPE = [rehypeSanitize, rehypeKatex, rehypeHighlight];

const STATUS = {
  idle: { label: "Waiting", cls: "bg-white/10 text-slate-300" },
  loading: { label: "Thinking...", cls: "bg-amber-400/15 text-amber-300 border border-amber-400/30" },
  success: { label: "Done", cls: "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30" },
  error: { label: "Failed", cls: "bg-rose-400/15 text-rose-300 border border-rose-400/30" },
};

export default function AnswerCard({ provider, model, result }) {
  const [copied, setCopied] = useState(false);
  const status = result?.status || "idle";
  const { Icon } = provider;

  const copy = async () => {
    if (!result?.answer) return;
    try {
      await navigator.clipboard.writeText(result.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <article className="glass relative flex h-[32rem] sm:h-[36rem] flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 shadow-xl transition-all duration-300 hover:border-white/25">
      {/* Top Accent Gradient Bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${provider.gradient}`} />

      {/* Card Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 p-4 sm:p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${provider.gradient} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-white">{provider.name}</h3>
            <p className="truncate font-mono text-xs text-slate-400">{result?.model || model || provider.by}</p>
          </div>
        </div>
        <span className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[status].cls}`}>
          {status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
          {STATUS[status].label}
        </span>
      </header>

      {/* Scrollable Answer Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-white/10">
        {status === "idle" && (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-10">
            <p className="text-sm">The answer from {provider.name} will appear here.</p>
          </div>
        )}

        {status === "loading" && (
          <div className="space-y-3 pt-2" aria-busy="true">
            {[90, 75, 82, 60, 85, 45].map((w, i) => (
              <div key={i} className="shimmer h-3.5 rounded-lg bg-white/5" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3.5 text-xs sm:text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span className="break-words">{result.error || "Something went wrong."}</span>
          </div>
        )}

        {status === "success" && (
          <div className="md text-sm sm:text-base leading-relaxed text-slate-200">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={REHYPE}>
              {result.answer}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <footer className="shrink-0 flex items-center justify-between border-t border-white/10 bg-black/20 px-4 py-3 sm:px-5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>{result && status !== "loading" && result.response_time ? `${result.response_time.toFixed(1)}s` : "-"}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={status !== "success"}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-slate-200 transition hover:bg-white/15 hover:text-white enabled:hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </footer>
    </article>
  );
}
