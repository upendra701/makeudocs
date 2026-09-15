"use client";

import { useRef, useState } from "react";

type OcrResult = { text: string; confidence?: number };

type TesseractApi = {
  recognize: (image: File, language: string, options?: { logger?: (message: { status?: string; progress?: number }) => void }) => Promise<{ data: OcrResult }>;
};

declare global {
  interface Window { Tesseract?: TesseractApi; }
}

let tesseractPromise: Promise<TesseractApi> | null = null;

function loadTesseract() {
  if (typeof window === "undefined") return Promise.reject(new Error("OCR is only available in a browser."));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise<TesseractApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-makeudocs-tesseract]');
    if (existing) {
      existing.addEventListener("load", () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR engine could not be loaded.")), { once: true });
      existing.addEventListener("error", () => reject(new Error("OCR engine could not be loaded.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.dataset.makeudocsTesseract = "true";
    script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR engine could not be loaded."));
    script.onerror = () => reject(new Error("Could not load the OCR engine. Check your internet connection and try again."));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

export default function OcrPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [language, setLanguage] = useState("eng");
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const choose = (next?: File) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) { setError("Please select an image file."); return; }
    setFile(next); setPreview(URL.createObjectURL(next)); setText(""); setConfidence(null); setProgress(0); setStatus(""); setError("");
  };

  const runOcr = async () => {
    if (!file) return;
    setBusy(true); setError(""); setText(""); setConfidence(null); setProgress(0); setStatus("Loading OCR engine…");
    try {
      const tesseract = await loadTesseract();
      const result = await tesseract.recognize(file, language, {
        logger: (message) => {
          if (typeof message.progress === "number") setProgress(Math.round(message.progress * 100));
          if (message.status) setStatus(message.status.replace(/_/g, " "));
        },
      });
      setText(result.data.text.trim());
      setConfidence(typeof result.data.confidence === "number" ? result.data.confidence : null);
      setProgress(100); setStatus("Text extracted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR could not process this image.");
      setStatus("");
    } finally { setBusy(false); }
  };

  const copyText = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setStatus("Text copied to clipboard.");
  };

  const downloadText = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file?.name.replace(/\.[^.]+$/, "") || "ocr-result"}.txt`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reset = () => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(""); setText(""); setConfidence(null); setProgress(0); setStatus(""); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12"><div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🔎</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs AI Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">OCR</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Extract text from images directly in your browser. Nothing is uploaded to MakeUdocs.</p></div>
      <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
        {!file ? <label onDragOver={(e)=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files?.[0])}} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging?"border-blue-500 bg-blue-50":"border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300"}`}><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span><h2 className="mt-6 text-xl font-extrabold">Drop an image here</h2><p className="mt-2 text-sm text-zinc-500">JPG, PNG, WebP and other browser-supported images</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose Image →</span><p className="mt-4 text-xs font-semibold text-zinc-400">Free · Browser-local OCR</p></label> : <div>
          <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size/1024/1024).toFixed(2)} MB</p></div><button type="button" onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Choose another</button></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 p-5"><img src={preview} alt="OCR source preview" className="mx-auto max-h-[600px] max-w-full rounded-lg object-contain shadow-xl" /></div>
            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">OCR settings</p><label className="mt-4 block text-xs font-extrabold">Language<select value={language} onChange={(e)=>setLanguage(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"><option value="eng">English</option><option value="hin">Hindi</option><option value="tel">Telugu</option></select></label><button type="button" onClick={runOcr} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?`Extracting ${progress}%…`:"Extract Text →"}</button>{busy&&<div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div><p className="mt-2 text-xs text-zinc-500">{status || "Processing image…"}</p></div>}{!busy&&status&&<p className="mt-3 text-xs font-semibold text-emerald-700">✓ {status}</p>}{confidence!==null&&<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">OCR confidence</p><p className="mt-1 text-lg font-extrabold">{Math.round(confidence)}%</p></div>}</aside></div>
          {text&&<div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Extracted text</p><p className="mt-1 text-xs text-zinc-400">Review the result before using it.</p></div><div className="flex gap-2"><button type="button" onClick={copyText} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Copy</button><button type="button" onClick={downloadText} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm">Download TXT</button></div></div><textarea value={text} onChange={(e)=>setText(e.target.value)} className="mt-4 min-h-[260px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 outline-none focus:border-blue-500" spellCheck={false}/></div>}
        </div>}
        {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
      </section>
      <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📝</span><h3 className="mt-3 text-sm font-extrabold">Extract text</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Turn text in photos and scanned images into editable text.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🌐</span><h3 className="mt-3 text-sm font-extrabold">Multiple languages</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Start with English, Hindi and Telugu OCR.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image is processed in your browser rather than uploaded to MakeUdocs.</p></div></section>
    </div></main>
  );
}
