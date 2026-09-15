"use client";

import { useRef, useState } from "react";

type OcrWord = { text: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } };
type OcrResult = { text: string; confidence?: number; words?: OcrWord[] };
type OcrOptions = { logger?: (message: { status?: string; progress?: number }) => void; config?: Record<string, string> };
type TesseractApi = { recognize: (image: File | HTMLCanvasElement, language: string, options?: OcrOptions) => Promise<{ data: OcrResult }> };

declare global { interface Window { Tesseract?: TesseractApi; } }
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

async function buildOcrCanvases(file: File) {
  const bitmap = await createImageBitmap(file);
  const sourceW = bitmap.width;
  const sourceH = bitmap.height;
  const scale = Math.min(3, Math.max(1.5, 2400 / Math.max(sourceW, sourceH)));
  const makeCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceW * scale));
    canvas.height = Math.max(1, Math.round(sourceH * scale));
    return canvas;
  };
  const original = makeCanvas();
  const enhanced = makeCanvas();
  const originalCtx = original.getContext("2d");
  const enhancedCtx = enhanced.getContext("2d", { willReadFrequently: true });
  if (!originalCtx || !enhancedCtx) { bitmap.close(); throw new Error("Your browser could not create an OCR canvas."); }
  originalCtx.imageSmoothingEnabled = true;
  originalCtx.imageSmoothingQuality = "high";
  enhancedCtx.imageSmoothingEnabled = true;
  enhancedCtx.imageSmoothingQuality = "high";
  originalCtx.drawImage(bitmap, 0, 0, original.width, original.height);
  enhancedCtx.drawImage(bitmap, 0, 0, enhanced.width, enhanced.height);
  bitmap.close();
  const image = enhancedCtx.getImageData(0, 0, enhanced.width, enhanced.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    data[i] = contrast; data[i + 1] = contrast; data[i + 2] = contrast;
  }
  enhancedCtx.putImageData(image, 0, 0);
  return { original, enhanced };
}

function cleanOcrText(value: string) {
  return value.replace(/[\t ]+$/gm, "").replace(/^\s+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

function isUsefulWord(value: string) {
  // Keep Latin, numbers, Telugu/Hindi Unicode and common punctuation, while
  // dropping isolated OCR artifacts such as pipes, icons and random marks.
  return /[A-Za-z0-9\u0900-\u097F\u0C00-\u0C7F]/u.test(value);
}

function structuredReadingOrder(data: OcrResult) {
  const words = (data.words || [])
    .filter((word) => word.bbox && word.text?.trim() && isUsefulWord(word.text.trim()) && (word.confidence ?? 0) >= 35)
    .map((word) => ({
      text: word.text.trim(),
      confidence: word.confidence ?? 0,
      x0: word.bbox!.x0,
      y0: word.bbox!.y0,
      x1: word.bbox!.x1,
      y1: word.bbox!.y1,
      cy: (word.bbox!.y0 + word.bbox!.y1) / 2,
      h: Math.max(1, word.bbox!.y1 - word.bbox!.y0),
    }))
    .sort((a, b) => a.cy - b.cy || a.x0 - b.x0);

  if (!words.length) return cleanOcrText(data.text || "");

  const lines: typeof words[] = [];
  for (const word of words) {
    const target = lines.find((line) => {
      const avgCy = line.reduce((sum, item) => sum + item.cy, 0) / line.length;
      const avgH = line.reduce((sum, item) => sum + item.h, 0) / line.length;
      return Math.abs(word.cy - avgCy) <= Math.max(avgH * 0.55, word.h * 0.55);
    });
    if (target) target.push(word);
    else lines.push([word]);
  }

  lines.sort((a, b) => Math.min(...a.map((w) => w.y0)) - Math.min(...b.map((w) => w.y0)));
  const rendered: string[] = [];
  let previousBottom = -Infinity;
  let previousHeight = 0;
  for (const line of lines) {
    line.sort((a, b) => a.x0 - b.x0);
    const top = Math.min(...line.map((w) => w.y0));
    const bottom = Math.max(...line.map((w) => w.y1));
    const height = Math.max(1, bottom - top);
    const gap = top - previousBottom;
    const paragraphBreak = previousBottom > -Infinity && gap > Math.max(previousHeight * 1.35, height * 1.35);
    let lineText = "";
    let lastRight = 0;
    let avgCharWidth = 0;
    let charCount = 0;
    for (const word of line) { avgCharWidth += word.x1 - word.x0; charCount++; }
    avgCharWidth = Math.max(8, avgCharWidth / Math.max(1, charCount * 4));
    for (const word of line) {
      const gapX = word.x0 - lastRight;
      const needsSpace = lineText.length > 0 && gapX > avgCharWidth * 0.55;
      lineText += `${needsSpace ? " " : ""}${word.text}`;
      lastRight = word.x1;
    }
    if (paragraphBreak) rendered.push("");
    rendered.push(lineText.trim());
    previousBottom = bottom;
    previousHeight = height;
  }
  return cleanOcrText(rendered.join("\n"));
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
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next)); setText(""); setConfidence(null); setProgress(0); setStatus(""); setError("");
  };

  const runOcr = async () => {
    if (!file) return;
    setBusy(true); setError(""); setText(""); setConfidence(null); setProgress(0); setStatus("Preparing layout-aware OCR…");
    try {
      const tesseract = await loadTesseract();
      const { original, enhanced } = await buildOcrCanvases(file);
      let lastProgress = 0;
      const recognize = (canvas: HTMLCanvasElement, label: string, offset: number) => tesseract.recognize(canvas, language, {
        config: { tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" },
        logger: (message) => {
          if (typeof message.progress === "number") {
            const overall = Math.round(offset + message.progress * 50);
            if (overall > lastProgress) { lastProgress = overall; setProgress(overall); }
          }
          if (message.status) setStatus(`${label}: ${message.status.replace(/_/g, " ")}`);
        },
      });
      const [first, second] = await Promise.all([recognize(original, "Original pass", 0), recognize(enhanced, "Enhanced pass", 50)]);
      const candidates = [first.data, second.data].map((data) => ({
        text: structuredReadingOrder(data),
        rawText: cleanOcrText(data.text || ""),
        confidence: typeof data.confidence === "number" ? data.confidence : 0,
      })).filter((candidate) => candidate.text.length > 0);
      if (!candidates.length) {
        setText("No readable text was detected. Try a sharper image, better lighting, or crop closer to the text.");
        setConfidence(null); setStatus("No readable text detected.");
      } else {
        candidates.sort((a, b) => (b.confidence - a.confidence) * 10 + (b.text.length - a.text.length) / 1000);
        const best = candidates[0];
        setText(best.text || best.rawText);
        setConfidence(best.confidence);
        setStatus("Text extracted with layout-aware reading order and noise filtering.");
      }
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR could not process this image.");
      setStatus("");
    } finally { setBusy(false); }
  };

  const copyText = async () => { if (!text) return; await navigator.clipboard.writeText(text); setStatus("Text copied to clipboard."); };
  const downloadText = () => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file?.name.replace(/\.[^.]+$/, "") || "ocr-result"}.txt`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(""); setText(""); setConfidence(null); setProgress(0); setStatus(""); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12"><div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🔎</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs AI Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">OCR</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Extract text from images with layout-aware recognition directly in your browser. Nothing is uploaded to MakeUdocs.</p></div>
      <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
        {!file ? <label onDragOver={(e)=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files?.[0])}} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging?"border-blue-500 bg-blue-50":"border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300"}`}><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span><h2 className="mt-6 text-xl font-extrabold">Drop an image here</h2><p className="mt-2 text-sm text-zinc-500">JPG, PNG, WebP and other browser-supported images</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose Image →</span><p className="mt-4 text-xs font-semibold text-zinc-400">Free · Browser-local OCR</p></label> : <div>
          <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size/1024/1024).toFixed(2)} MB</p></div><button type="button" onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Choose another</button></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 p-5"><img src={preview} alt="OCR source preview" className="mx-auto max-h-[600px] max-w-full rounded-lg object-contain shadow-xl" /></div>
            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">OCR settings</p><label className="mt-4 block text-xs font-extrabold">Language<select value={language} onChange={(e)=>setLanguage(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"><option value="eng">English</option><option value="hin">Hindi</option><option value="tel">Telugu</option></select></label><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><strong>Layout-aware mode:</strong> OCR words are filtered by confidence and rebuilt using their detected page positions, helping posters and marketing graphics read more naturally.</div><button type="button" onClick={runOcr} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?`Extracting ${progress}%…`:"Extract Text →"}</button>{busy&&<div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div><p className="mt-2 text-xs text-zinc-500">{status || "Processing image…"}</p></div>}{!busy&&status&&<p className="mt-3 text-xs font-semibold text-emerald-700">✓ {status}</p>}{confidence!==null&&<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">OCR confidence</p><p className="mt-1 text-lg font-extrabold">{Math.round(confidence)}%</p></div>}</aside></div>
          {text&&<div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Extracted text</p><p className="mt-1 text-xs text-zinc-400">Review the result before using it.</p></div><div className="flex gap-2"><button type="button" onClick={copyText} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Copy</button><button type="button" onClick={downloadText} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm">Download TXT</button></div></div><textarea value={text} onChange={(e)=>setText(e.target.value)} className="mt-4 min-h-[260px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 outline-none focus:border-blue-500" spellCheck={false}/></div>}
        </div>}
        {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
      </section>
      <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📝</span><h3 className="mt-3 text-sm font-extrabold">Extract text</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Turn text in photos and scanned images into editable text.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✨</span><h3 className="mt-3 text-sm font-extrabold">Layout-aware recognition</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Use detected word positions to reduce random symbols and improve reading order.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image is processed in your browser rather than uploaded to MakeUdocs.</p></div></section>
    </div></main>
  );
}
