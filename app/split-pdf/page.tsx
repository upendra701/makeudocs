"use client";

import { PDFDocument } from "pdf-lib";
import { useRef, useState } from "react";

type Range = { start: number; end: number };

function parseRanges(value: string, pageCount: number): Range[] {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) throw new Error("Enter at least one page or page range.");
  const ranges: Range[] = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > pageCount) throw new Error(`Page ${page} is outside this PDF.`);
      ranges.push({ start: page, end: page });
    } else if (/^\d+\s*-\s*\d+$/.test(part)) {
      const [a, b] = part.split("-").map((n) => Number(n.trim()));
      if (a < 1 || b > pageCount || a > b) throw new Error(`Invalid page range: ${part}`);
      ranges.push({ start: a, end: b });
    } else throw new Error(`Invalid range: ${part}. Use examples like 1, 3-5, 8.`);
  }
  return ranges;
}

export default function SplitPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeText, setRangeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);

  const choose = async (next?: File) => {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    try {
      const pdf = await PDFDocument.load(await next.arrayBuffer());
      setFile(next); setPageCount(pdf.getPageCount()); setRangeText(`1-${pdf.getPageCount()}`); setResultCount(0); setProgress(0); setError("");
    } catch { setError("This PDF could not be opened. Please choose a valid PDF file."); }
  };

  const split = async () => {
    if (!file) return;
    setBusy(true); setError(""); setProgress(5); setResultCount(0);
    try {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const ranges = parseRanges(rangeText, source.getPageCount());
      for (let i = 0; i < ranges.length; i++) {
        const output = await PDFDocument.create();
        const indexes = Array.from({ length: ranges[i].end - ranges[i].start + 1 }, (_, j) => ranges[i].start - 1 + j);
        const copied = await output.copyPages(source, indexes);
        copied.forEach((page) => output.addPage(page));
        const bytes = await output.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${file.name.replace(/\.pdf$/i, "")}-part-${i + 1}.pdf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setProgress(Math.round(((i + 1) / ranges.length) * 100));
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      setResultCount(ranges.length);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong while splitting the PDF."); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">✂️</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Split PDF</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Split a PDF into separate files using individual pages or custom page ranges — directly in your browser.</p>
        </div>

        <section className="mt-10 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label htmlFor="split-pdf-file" className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30">
              <input ref={inputRef} id="split-pdf-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span>
              <h2 className="mt-6 text-xl font-extrabold text-zinc-950">Select a PDF</h2>
              <p className="mt-2 text-sm text-zinc-500">Choose the PDF you want to split into smaller files.</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose PDF →</span>
            </label>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">📄</span><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} pages</p></div></div>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button>
                <input ref={inputRef} id="split-pdf-file-replace" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-extrabold">Choose pages to split</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Use commas for separate pages and hyphens for ranges. Example: <strong>1, 3-5, 8</strong>.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-600 shadow-sm">{pageCount} pages</span></div>
                <label className="mt-5 block text-xs font-extrabold text-zinc-700" htmlFor="split-ranges">Page ranges</label>
                <input id="split-ranges" value={rangeText} onChange={(e) => setRangeText(e.target.value)} placeholder="1, 3-5, 8" disabled={busy} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                <button type="button" onClick={split} disabled={busy || !rangeText.trim()} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,.2)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{busy ? `Splitting… ${progress}%` : "Split PDF →"}</button>
                {busy && <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>}
                {resultCount > 0 && !busy && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Created {resultCount} PDF {resultCount === 1 ? "file" : "files"}. Your downloads should be in your downloads folder.</div>}
              </div>
            </div>
          )}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PDF is processed locally in your browser.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✂️</span><h3 className="mt-3 text-sm font-extrabold">Custom ranges</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Create separate files from any pages or ranges you choose.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">⚡</span><h3 className="mt-3 text-sm font-extrabold">No upload</h3><p className="mt-1 text-xs leading-5 text-zinc-500">No server queue — splitting happens on your device.</p></div>
        </section>
      </div>
    </main>
  );
}
