"use client";

import { PDFDocument } from "pdf-lib";
import { useRef, useState } from "react";

type PagePreview = { page: number; dataUrl: string };

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
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeText, setRangeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState(0);

  const loadPreviews = async (next: File) => {
    setPreviewBusy(true);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await next.arrayBuffer()) }).promise;
      const items: PagePreview[] = [];
      const initialSelected: number[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.45 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create the PDF preview.");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        items.push({ page: i, dataUrl: canvas.toDataURL("image/jpeg", 0.72) });
        initialSelected.push(i);
      }
      setPreviews(items);
      setSelectedPages(initialSelected);
    } finally {
      setPreviewBusy(false);
    }
  };

  const choose = async (next?: File) => {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    setError("");
    try {
      const pdf = await PDFDocument.load(await next.arrayBuffer());
      const count = pdf.getPageCount();
      setFile(next);
      setPageCount(count);
      setRangeText(`1-${count}`);
      setResultCount(0);
      setProgress(0);
      await loadPreviews(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This PDF could not be opened. Please choose a valid PDF file.");
      setFile(null);
      setPreviews([]);
      setSelectedPages([]);
    }
  };

  const togglePage = (page: number) => {
    setSelectedPages((current) => current.includes(page) ? current.filter((item) => item !== page) : [...current, page].sort((a, b) => a - b));
    setResultCount(0);
  };

  const selectAll = () => setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1));
  const clearSelection = () => setSelectedPages([]);

  const splitSelected = async () => {
    if (!file || !selectedPages.length) return;
    setBusy(true); setError(""); setProgress(10); setResultCount(0);
    try {
      const source = await PDFDocument.load(await file.arrayBuffer());
      const output = await PDFDocument.create();
      const indexes = selectedPages.map((page) => page - 1);
      const copied = await output.copyPages(source, indexes);
      copied.forEach((page) => output.addPage(page));
      setProgress(75);
      const bytes = await output.save();
      const safeBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(safeBuffer).set(bytes);
      const blob = new Blob([safeBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.pdf$/i, "")}-selected-pages.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setProgress(100);
      setResultCount(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while creating the split PDF.");
    } finally { setBusy(false); }
  };

  const splitRanges = async () => {
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
        const safeBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(safeBuffer).set(bytes);
        const blob = new Blob([safeBuffer], { type: "application/pdf" });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while splitting the PDF.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">✂️</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Split PDF</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Preview your PDF, select exactly the pages you need, and split them into a new PDF — directly in your browser.</p>
        </div>

        <section className="mt-10 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label htmlFor="split-pdf-file" className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30">
              <input ref={inputRef} id="split-pdf-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span>
              <h2 className="mt-6 text-xl font-extrabold text-zinc-950">Select a PDF</h2>
              <p className="mt-2 text-sm text-zinc-500">We’ll show every page so you can see exactly what you are splitting.</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose PDF →</span>
            </label>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">📄</span><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} pages</p></div></div>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || previewBusy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button>
                <input ref={inputRef} id="split-pdf-file-replace" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-extrabold">Preview & choose pages</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Click any page to select or remove it from the split.</p></div><div className="flex items-center gap-2"><button type="button" onClick={selectAll} disabled={busy || previewBusy} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Select all</button><button type="button" onClick={clearSelection} disabled={busy || previewBusy} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-zinc-300">Clear</button></div></div>
                {previewBusy ? <div className="flex min-h-[260px] items-center justify-center text-sm font-bold text-zinc-500">Preparing page previews…</div> : <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{previews.map((preview) => { const selected = selectedPages.includes(preview.page); return <button key={preview.page} type="button" onClick={() => togglePage(preview.page)} disabled={busy} aria-pressed={selected} className={`group relative overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${selected ? "border-blue-500 ring-4 ring-blue-100" : "border-zinc-200 opacity-70 hover:opacity-100"}`}><div className="aspect-[3/4] bg-zinc-100 p-2"><img src={preview.dataUrl} alt={`PDF page ${preview.page}`} className="h-full w-full object-contain" /></div><div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2.5"><span className="text-xs font-extrabold text-zinc-700">Page {preview.page}</span><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${selected ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400"}`}>{selected ? "✓" : "+"}</span></div>{selected && <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">Selected</span>}</button>; })}</div>}
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-extrabold text-zinc-900">{selectedPages.length} of {pageCount} pages selected</p><p className="mt-1 text-xs text-zinc-500">Selected pages will be combined into one new PDF.</p></div><button type="button" onClick={splitSelected} disabled={busy || previewBusy || !selectedPages.length} className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.2)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{busy ? `Creating… ${progress}%` : "Split Selected Pages →"}</button></div>
              </div>

              <details className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><summary className="cursor-pointer text-sm font-extrabold text-zinc-800">Advanced: split by page ranges</summary><div className="mt-4"><p className="text-xs leading-5 text-zinc-500">Create a separate PDF for each range. Example: <strong>1, 3-5, 8</strong> creates three files.</p><input id="split-ranges" value={rangeText} onChange={(e) => setRangeText(e.target.value)} placeholder="1, 3-5, 8" disabled={busy} className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /><button type="button" onClick={splitRanges} disabled={busy || !rangeText.trim()} className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100">Split into separate files →</button></div></details>
            </div>
          )}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
          {resultCount > 0 && !busy && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Created {resultCount} PDF {resultCount === 1 ? "file" : "files"}. Your download should be in your downloads folder.</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">👀</span><h3 className="mt-3 text-sm font-extrabold">Visual preview</h3><p className="mt-1 text-xs leading-5 text-zinc-500">See every PDF page before deciding what to split.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🎯</span><h3 className="mt-3 text-sm font-extrabold">Pick exact pages</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Click pages to select only the content you need.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">PDF processing and previews stay on your device.</p></div></section>
      </div>
    </main>
  );
}
