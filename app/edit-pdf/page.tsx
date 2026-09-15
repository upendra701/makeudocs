"use client";

import { useEffect, useRef, useState } from "react";

type PdfDoc = Awaited<ReturnType<typeof import("pdfjs-dist")["getDocument"]>["promise"]>;
type TextItem = {
  id: number;
  page: number;
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

export default function EditPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PdfDoc | null>(null);
  const fileRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [pdfScale, setPdfScale] = useState(1.35);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [fontSize, setFontSize] = useState(14);
  const [color, setColor] = useState("#111827");
  const [cover, setCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const loadPdf = async (next: File) => {
    setError(""); setReady(false); setTextItems([]); setSelectedId(null); setPage(1); setFile(next); setFileName(next.name); fileRef.current = next;
    try {
      if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) throw new Error("Please select a PDF file.");
      const pdfjsLib = await import("pdfjs-dist");
      const base = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}build/pdf.worker.min.mjs`;
      const data = new Uint8Array(await next.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data, useWasm: true, wasmUrl: `${base}wasm/`, useWorkerFetch: true, isImageDecoderSupported: false }).promise;
      pdfRef.current = pdf; setPageCount(pdf.numPages); setReady(true);
    } catch (err) {
      pdfRef.current = null; setFile(null); setFileName(""); setPageCount(0); setError(err instanceof Error ? err.message : "Could not open this PDF.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas || !ready) return;
      try {
        const pdfPage = await pdf.getPage(page);
        const viewport = pdfPage.getViewport({ scale: pdfScale });
        const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("Unable to create PDF preview canvas.");
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] as [number, number, number, number, number, number] : undefined;
        await pdfPage.render({ canvas, canvasContext: ctx, viewport, transform }).promise;
        if (!cancelled) {
          setReady(true);
          setPdfScale((current) => current);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not render this page.");
      }
    };
    render();
    return () => { cancelled = true; };
  }, [page, pdfScale, ready]);

  const choose = (next?: File) => { if (next) void loadPdf(next); };

  const addTextAt = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !draft.trim()) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, (event.clientX - rect.left) / rect.width * canvas.width / (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
    const yTop = Math.max(0, (event.clientY - rect.top) / rect.height * canvas.height / (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1));
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setTextItems((items) => [...items, { id, page, x, y: yTop, text: draft.trim(), size: fontSize, color }]);
    setSelectedId(id);
    setDraft("");
  };

  const removeSelected = () => {
    if (selectedId === null) return;
    setTextItems((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const reset = () => {
    setFile(null); fileRef.current = null; pdfRef.current = null; setFileName(""); setPageCount(0); setPage(1); setTextItems([]); setSelectedId(null); setDraft(""); setError(""); setReady(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const save = async () => {
    if (!file || !textItems.length) return;
    setBusy(true); setError("");
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const source = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(source);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      for (const item of textItems) {
        const target = pages[item.page - 1];
        if (!target) continue;
        const pageWidth = target.getWidth();
        const pageHeight = target.getHeight();
        const canvas = canvasRef.current;
        const previewWidth = canvas?.getBoundingClientRect().width || pageWidth * pdfScale;
        const previewHeight = canvas?.getBoundingClientRect().height || pageHeight * pdfScale;
        const scaleX = pageWidth / previewWidth;
        const scaleY = pageHeight / previewHeight;
        const x = item.x * scaleX;
        const y = pageHeight - item.y * scaleY - item.size * scaleY;
        if (cover) {
          const textWidth = font.widthOfTextAtSize(item.text, item.size * scaleX);
          target.drawRectangle({ x: x - 3, y: y - 3, width: textWidth + 8, height: item.size * scaleY + 8, color: rgb(1, 1, 1), opacity: 1 });
        }
        const c = hexToRgb(item.color);
        target.drawText(item.text, { x, y, size: item.size * scaleX, font, color: rgb(c.r, c.g, c.b), maxWidth: Math.max(10, pageWidth - x - 10) });
      }
      const bytes = await doc.save();
      const safe = new ArrayBuffer(bytes.byteLength); new Uint8Array(safe).set(bytes);
      const url = URL.createObjectURL(new Blob([safe], { type: "application/pdf" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file.name.replace(/\.pdf$/i, "")}-edited.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create the edited PDF."); }
    finally { setBusy(false); }
  };

  const pageItems = textItems.filter((item) => item.page === page);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">✏️</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Edit PDF</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Add text directly onto PDF pages, position it visually, and download an edited copy — right in your browser.</p>
        </div>

        <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300 hover:bg-blue-50/30"}`}>
              <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span>
              <h2 className="mt-6 text-xl font-extrabold">Drop a PDF here</h2><p className="mt-2 text-sm text-zinc-500">or choose a PDF from your device</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose PDF →</span>
              <p className="mt-4 text-xs font-semibold text-zinc-400">Free · No signup · Browser-local</p>
            </label>
          ) : (
            <div>
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-extrabold">{fileName}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {pageCount} {pageCount === 1 ? "page" : "pages"}</p></div>
                <button type="button" onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Choose another</button>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_310px]">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><span className="rounded-lg bg-white px-3 py-2 text-xs font-extrabold shadow-sm">Page {page} / {pageCount}</span><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold disabled:opacity-40">←</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold disabled:opacity-40">→</button></div>
                    <p className="text-xs font-semibold text-zinc-500">Click the page to place your text</p>
                  </div>
                  <div ref={stageRef} className="flex min-h-[560px] items-start justify-center overflow-auto rounded-xl border border-zinc-200 bg-zinc-200 p-5">
                    <div className="relative inline-block bg-white shadow-2xl">
                      <canvas ref={canvasRef} onClick={addTextAt} aria-label="PDF page editor preview" className="block max-w-full cursor-crosshair" />
                      {pageItems.map((item) => {
                        const canvas = canvasRef.current;
                        const rect = canvas?.getBoundingClientRect();
                        const left = rect && canvas ? item.x / canvas.width * rect.width : 0;
                        const top = rect && canvas ? item.y / canvas.height * rect.height : 0;
                        return <button key={item.id} type="button" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }} style={{ left, top, color: item.color, fontSize: `${Math.max(10, item.size * (rect && canvas ? rect.width / canvas.width : 1))}px` }} className={`absolute max-w-[80%] whitespace-pre-wrap rounded px-1 text-left leading-tight ${selectedId === item.id ? "bg-blue-100/80 ring-2 ring-blue-500" : "bg-white/70 ring-1 ring-zinc-300"}`}>{item.text}</button>;
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((number) => <button key={number} type="button" onClick={() => setPage(number)} className={`min-w-10 rounded-lg border px-3 py-2 text-xs font-extrabold ${page === number ? "border-blue-500 bg-blue-600 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}>{number}</button>)}
                  </div>
                </div>

                <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Text editor</p>
                  <label className="mt-4 block text-xs font-extrabold">Text to add<textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type text, then click the PDF where it should go…" rows={4} className="mt-2 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500" /></label>
                  <div className="mt-4 grid grid-cols-2 gap-3"><label className="block text-xs font-extrabold">Size<input type="number" min="6" max="72" value={fontSize} onChange={(e) => setFontSize(Math.min(72, Math.max(6, Number(e.target.value) || 14)))} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold" /></label><label className="block text-xs font-extrabold">Color<input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1" /></label></div>
                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs font-semibold"><input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="block font-extrabold">Cover existing text</span><span className="mt-1 block font-normal text-zinc-500">Places a white patch behind new text to visually replace the old text.</span></span></label>
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><strong>How it works:</strong> type your text above, then click anywhere on the page preview. Each click creates a text item that will be added to the final PDF.</div>
                  {selectedId !== null && <button type="button" onClick={removeSelected} className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-extrabold text-red-700">Remove selected text</button>}
                  <button type="button" onClick={save} disabled={busy || textItems.length === 0} className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-50">{busy ? "Creating PDF…" : "Download Edited PDF →"}</button>
                  {textItems.length > 0 && <p className="mt-3 text-center text-xs font-semibold text-zinc-500">{textItems.length} text {textItems.length === 1 ? "item" : "items"} added</p>}
                </aside>
              </div>
            </div>
          )}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✏️</span><h3 className="mt-3 text-sm font-extrabold">Add text visually</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Place new text exactly where you need it on any PDF page.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📄</span><h3 className="mt-3 text-sm font-extrabold">Multi-page support</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Move between pages and add multiple text items before exporting.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PDF stays on your device while you edit it.</p></div></section>
      </div>
    </main>
  );
}
