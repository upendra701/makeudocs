"use client";

import { PDFDocument, degrees } from "pdf-lib";
import { useRef, useState } from "react";

type Rotation = 90 | 180 | 270;

export default function RotatePdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rotation, setRotation] = useState<Rotation>(90);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const choose = async (next?: File) => {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setError("Please select a PDF file."); return; }
    try {
      const pdf = await PDFDocument.load(await next.arrayBuffer());
      const count = pdf.getPageCount();
      setFile(next); setPageCount(count); setSelected(new Set(Array.from({ length: count }, (_, i) => i))); setProgress(0); setDone(false); setError("");
    } catch { setError("This PDF could not be opened. Please choose a valid PDF file."); }
  };

  const toggle = (index: number) => setSelected((current) => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; });
  const selectAll = () => setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  const clear = () => setSelected(new Set());

  const rotate = async () => {
    if (!file || selected.size === 0) { setError("Select at least one page to rotate."); return; }
    setBusy(true); setError(""); setDone(false); setProgress(8);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const pages = pdf.getPages();
      pages.forEach((page, index) => { if (selected.has(index)) page.setRotation(degrees((page.getRotation().angle + rotation) % 360)); setProgress(Math.round(((index + 1) / pages.length) * 88)); });
      const bytes = await pdf.save();
      const safeBuffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(safeBuffer).set(bytes);
      const blob = new Blob([safeBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file.name.replace(/\.pdf$/i, "")}-rotated.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setProgress(100); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong while rotating the PDF."); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:py-14"><div className="mx-auto max-w-6xl"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🔄</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Rotate PDF</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Preview your PDF, choose exactly which pages to rotate, and download the updated file in seconds.</p></div>
  <section className="mt-10 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">{!file ? <label htmlFor="rotate-pdf-file" className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30"><input ref={inputRef} id="rotate-pdf-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span><h2 className="mt-6 text-xl font-extrabold">Select a PDF</h2><p className="mt-2 text-sm text-zinc-500">Choose a PDF and preview its pages before rotating.</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose PDF →</span></label> : <div><div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">📄</span><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} pages</p></div></div><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button><input ref={inputRef} id="rotate-pdf-file-replace" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])}/></div>
  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-extrabold">Select pages</h2><p className="mt-1 text-xs text-zinc-500">Click pages to include or exclude them from rotation.</p></div><div className="flex gap-2"><button type="button" onClick={selectAll} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold shadow-sm">Select all</button><button type="button" onClick={clear} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold shadow-sm">Clear</button></div></div>
  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" onClick={() => toggle(index)} disabled={busy} className={`relative min-h-36 rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 ${selected.has(index) ? "border-blue-500 bg-blue-50 shadow-[0_12px_28px_rgba(37,99,235,.12)]" : "border-zinc-200 bg-zinc-50 opacity-60"}`}><div className="flex h-24 items-center justify-center rounded-lg border border-zinc-200 bg-white text-4xl shadow-inner">📄</div><p className="mt-2 text-center text-xs font-extrabold">Page {index + 1}</p>{selected.has(index) && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">✓</span>}</button>)}</div>
  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-extrabold">Rotation</h2><p className="mt-1 text-xs text-zinc-500">Selected pages: <strong>{selected.size}</strong></p></div><div className="flex gap-2">{([90,180,270] as Rotation[]).map((value) => <button key={value} type="button" onClick={() => setRotation(value)} disabled={busy} className={`rounded-xl border px-4 py-2.5 text-xs font-extrabold transition ${rotation === value ? "border-blue-500 bg-blue-600 text-white shadow-md" : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200"}`}>{value}°</button>)}</div></div><button type="button" onClick={rotate} disabled={busy || selected.size === 0} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,.2)] disabled:cursor-wait disabled:opacity-70">{busy ? `Rotating… ${progress}%` : "Rotate Selected Pages →"}</button>{busy && <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div>}{done && !busy && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Rotated {selected.size} page{selected.size === 1 ? "" : "s"}. Your updated PDF is in your downloads folder.</div>}</div></div>}{error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}</section>
  <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">👁️</span><h3 className="mt-3 text-sm font-extrabold">Preview first</h3><p className="mt-1 text-xs leading-5 text-zinc-500">See every page before deciding what to rotate.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🎯</span><h3 className="mt-3 text-sm font-extrabold">Rotate selected pages</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Leave pages that are already correct exactly as they are.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PDF stays on your device while it is processed.</p></div></section></div></main>;
}
