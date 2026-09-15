"use client";

import { PDFDocument, degrees } from "pdf-lib";
import { useRef, useState } from "react";

type Rotation = 90 | 180 | 270;
type PdfDocument = Awaited<ReturnType<typeof import("pdfjs-dist")["getDocument"]>>["promise"] extends Promise<infer T> ? T : never;

export default function RotatePdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rotation, setRotation] = useState<Rotation>(90);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renderedPages, setRenderedPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const renderPages = async (pdf: PdfDocument, pdfjsLib: typeof import("pdfjs-dist")) => {
    setRenderedPages(0);

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.1 });
      const canvas = canvasRefs.current[pageNumber];

      if (!canvas) throw new Error(`Preview canvas for page ${pageNumber} is not available.`);

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error(`Unable to create preview for page ${pageNumber}.`);

      const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      });

      await renderTask.promise;
      setRenderedPages(pageNumber);

      if ("cleanup" in page && typeof page.cleanup === "function") page.cleanup();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  };

  const choose = async (next?: File) => {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);
    setFile(next);
    setPageCount(0);
    setRenderedPages(0);
    setProgress(0);
    canvasRefs.current = {};

    try {
      const pdfjsLib = await import("pdfjs-dist");
      const pdfjsBaseUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${pdfjsBaseUrl}build/pdf.worker.min.mjs`;

      const data = new Uint8Array(await next.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({
        data,
        useWasm: true,
        wasmUrl: `${pdfjsBaseUrl}wasm/`,
        useWorkerFetch: true,
        isImageDecoderSupported: false,
      }).promise;

      setPageCount(pdf.numPages);
      setSelected(new Set(Array.from({ length: pdf.numPages }, (_, index) => index)));
      setLoading(false);

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await renderPages(pdf, pdfjsLib);
    } catch (err) {
      console.error("Rotate PDF preview failed:", err);
      setError(err instanceof Error ? err.message : "This PDF could not be previewed. Please choose a valid PDF.");
      setLoading(false);
      setPageCount(0);
      setRenderedPages(0);
    }
  };

  const toggle = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
    setDone(false);
  };

  const selectAll = () => {
    setSelected(new Set(Array.from({ length: pageCount }, (_, index) => index)));
    setDone(false);
  };

  const clear = () => {
    setSelected(new Set());
    setDone(false);
  };

  const rotate = async () => {
    if (!file || selected.size === 0) {
      setError("Select at least one page to rotate.");
      return;
    }

    setBusy(true);
    setError("");
    setDone(false);
    setProgress(8);

    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const pages = pdf.getPages();

      pages.forEach((page, index) => {
        if (selected.has(index)) {
          page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
        }
        setProgress(Math.round(((index + 1) / pages.length) * 88));
      });

      const bytes = await pdf.save();
      const safeBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(safeBuffer).set(bytes);
      const blob = new Blob([safeBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.pdf$/i, "")}-rotated.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setProgress(100);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while rotating the PDF.");
    } finally {
      setBusy(false);
    }
  };

  const previewProgress = pageCount > 0 ? Math.round((renderedPages / pageCount) * 100) : 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🔄</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Rotate PDF</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Preview every page, choose exactly what to rotate, see the rotation before downloading, and keep everything in your browser.</p>
        </div>

        <section className="mt-10 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label htmlFor="rotate-pdf-file" className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30">
              <input ref={inputRef} id="rotate-pdf-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => choose(event.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span>
              <h2 className="mt-6 text-xl font-extrabold">Select a PDF</h2>
              <p className="mt-2 text-sm text-zinc-500">Your actual PDF pages will appear here as previews.</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose PDF →</span>
            </label>
          ) : (
            <div>
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">📄</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{file.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} pages</p>
                  </div>
                </div>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy || loading} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button>
                <input ref={inputRef} id="rotate-pdf-file-replace" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => choose(event.target.files?.[0])} />
              </div>

              {loading && (
                <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/50 p-6 text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                  <p className="mt-4 text-sm font-extrabold text-zinc-800">Preparing your PDF preview…</p>
                  <p className="mt-1 text-xs text-zinc-500">Reading the document locally in your browser.</p>
                </div>
              )}

              {pageCount > 0 && !loading && (
                <>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-extrabold">Preview & select pages</h2>
                      <p className="mt-1 text-xs text-zinc-500">Click a page to include or exclude it. Selected pages show the rotation preview.</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAll} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold shadow-sm">Select all</button>
                      <button type="button" onClick={clear} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold shadow-sm">Clear</button>
                    </div>
                  </div>

                  {renderedPages < pageCount && (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-600"><span>Rendering page previews</span><span>{renderedPages} / {pageCount}</span></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${previewProgress}%` }} /></div>
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {Array.from({ length: pageCount }, (_, index) => {
                      const isSelected = selected.has(index);
                      const isRendered = index + 1 <= renderedPages;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggle(index)}
                          disabled={busy || !isRendered}
                          aria-label={`Page ${index + 1}${isSelected ? ", selected" : ", not selected"}`}
                          className={`group relative overflow-hidden rounded-2xl border-2 p-2 text-left transition hover:-translate-y-0.5 ${isSelected ? "border-blue-500 bg-blue-50 shadow-[0_12px_28px_rgba(37,99,235,.14)]" : "border-zinc-200 bg-zinc-50 opacity-70 hover:opacity-100"}`}
                        >
                          <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 p-2 sm:h-56">
                            {isRendered ? (
                              <canvas
                                ref={(canvas) => { canvasRefs.current[index + 1] = canvas; }}
                                className="max-h-full max-w-full rounded-sm bg-white shadow-md transition-transform duration-300"
                                style={{ transform: isSelected ? `rotate(${rotation}deg)` : "rotate(0deg)" }}
                              />
                            ) : (
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-blue-500" />
                            )}
                          </div>
                          <div className="flex items-center justify-between px-1 pb-1 pt-3">
                            <span className="text-xs font-extrabold text-zinc-800">Page {index + 1}</span>
                            {isSelected && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-sm">✓</span>}
                          </div>
                          {isSelected && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-extrabold text-blue-700 shadow-sm">Preview {rotation}°</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-base font-extrabold">Rotation</h2>
                        <p className="mt-1 text-xs text-zinc-500">Selected pages: <strong>{selected.size}</strong> · The thumbnails update instantly as you change the angle.</p>
                      </div>
                      <div className="flex gap-2">
                        {([90, 180, 270] as Rotation[]).map((value) => (
                          <button key={value} type="button" onClick={() => { setRotation(value); setDone(false); }} disabled={busy} className={`rounded-xl border px-4 py-2.5 text-xs font-extrabold transition ${rotation === value ? "border-blue-500 bg-blue-600 text-white shadow-md" : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-200"}`}>{value}°</button>
                        ))}
                      </div>
                    </div>

                    <button type="button" onClick={rotate} disabled={busy || selected.size === 0 || renderedPages !== pageCount} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,.2)] disabled:cursor-not-allowed disabled:opacity-60">
                      {busy ? `Rotating… ${progress}%` : renderedPages !== pageCount ? "Preparing Preview…" : "Rotate Selected Pages →"}
                    </button>
                    {busy && <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>}
                    {done && !busy && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Rotated {selected.size} page{selected.size === 1 ? "" : "s"}. Your updated PDF is in your downloads folder.</div>}
                  </div>
                </>
              )}
            </div>
          )}

          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">👁️</span><h3 className="mt-3 text-sm font-extrabold">Real page previews</h3><p className="mt-1 text-xs leading-5 text-zinc-500">See the actual content of every PDF page before changing it.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔄</span><h3 className="mt-3 text-sm font-extrabold">Live rotation preview</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Choose 90°, 180°, or 270° and see the selected thumbnails rotate instantly.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PDF is rendered and processed locally in your browser.</p></div>
        </section>
      </div>
    </main>
  );
}
