const API = import.meta.env.VITE_API_URL || "";

/** POSTs the question (text, image, or both) and calls onResult({provider, result}) as each model finishes (SSE). */
export async function solveStream(input, onResult, signal) {
  const body = new FormData();
  if (input instanceof File || input instanceof Blob) {
    body.append("file", input);
  } else if (input && typeof input === "object") {
    if (input.file) body.append("file", input.file);
    if (input.text && input.text.trim()) body.append("text", input.text.trim());
  }

  const res = await fetch(`${API}/api/v1/solve/stream`, { method: "POST", body, signal });
  if (!res.ok) {
    let msg = `Request failed (${res.status}).`;
    try { msg = (await res.json()).detail || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = /^event: (.*)$/m.exec(block)?.[1];
      const data = /^data: (.*)$/m.exec(block)?.[1];
      if (event === "result" && data) onResult(JSON.parse(data));
    }
  }
}

export const API_BASE = API;
