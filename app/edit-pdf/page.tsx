"use client";

import { PDFDocument } from "pdf-lib";
import { useEffect, useRef, useState } from "react";

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
};

type TextItem = {
  id: string;
  page: number;
  text: string;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  style: TextStyle;
};

type PagePreview = { page: number; dataUrl: string; width: number; height: number };

const DEFAULT_STYLE: TextStyle = {
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  color: "#111111",
  bold: false,
  italic: false,
};

function rgbToHex(r = 0, g = 0, b = 0) {
  return `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

function normalizeFontFamily(value: string) {
  if (!value) return DEFAULT_STYLE.fontFamily;
  const clean = value.replace(/["']/g, "").trim();
  const lower = clean.toLowerCase();
  if (lower.includes("arial")) return "Arial, sans-serif";
  if (lower.includes("helvetica")) return "Helvetica, Arial, sans-serif";
  if (lower.includes("times")) return "Times New Roman, serif";
  if (lower.includes("courier")) return "Courier New, monospace";
  if (lower.includes("georgia")) return "Georgia, serif";
  return `${clean}, Arial, sans-serif`;
}

export default function EditPdfPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [items, setItems] = useState<TextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [scale, setScale] = useState(1.15);
  const [tool, setTool] = useState<"select" | "add">("select");

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const pageItems = items.filter((item) => item.page === currentPage);
  const currentPreview = previews.find((p) => p.page === currentPage);

  useEffect(() => {
    const canvas = renderCanvasRef.current;
    const preview = currentPreview;
    if (!canvas || !preview) return;
    const ratio = preview.width / 595;
    const width = preview.width * scale;
    const height = preview.height * scale;
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, width, height);
    image.src = preview.dataUrl;
    void ratio;
  }, [currentPreview, scale]);

  const openPdf = async (next?: File) => {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("Reading your PDF locally…");
    setFile(next);
    setPdfBytes(await next.arrayBuffer());
    setItems([]);
    setPreviews([]);
    setSelectedId(null);
    setCurrentPage(1);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      const base = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/`;
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${base}build/pdf.worker.min.mjs`;
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(await next.arrayBuffer()),
        useWasm: true,
        wasmUrl: `${base}wasm/`,
        useWorkerFetch: true,
        isImageDecoderSupported: false,
      }).promise;
      setPageCount(pdf.numPages);

      const nextPreviews: PagePreview[] = [];
      const nextItems: TextItem[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setStatus(`Analyzing page ${pageNumber} of ${pdf.numPages}…`);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("Unable to create PDF preview.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        nextPreviews.push({ page: pageNumber, dataUrl: canvas.toDataURL("image/jpeg", 0.86), width: viewport.width, height: viewport.height });

        const content = await page.getTextContent({ includeMarkedContent: false });
        const styles = content.styles as Record<string, { fontFamily?: string; ascent?: number; descent?: number }>; 
        content.items.forEach((raw: unknown, index) => {
          if (!("str" in (raw as object))) return;
          const item = raw as { str: string; transform: number[]; width: number; height: number; fontName?: string };
          if (!item.str.trim()) return;
          const [a, b, c, d, e, f] = item.transform;
          const fontSize = Math.max(5, Math.sqrt(a * a + b * b));
          const styleInfo = styles[item.fontName || ""] || {};
          const fontFamily = normalizeFontFamily(styleInfo.fontFamily || "Arial");
          const bold = /bold|black|heavy|semibold/i.test(fontFamily) || /bold|black|heavy|semibold/i.test(item.fontName || "");
          const italic = /italic|oblique/i.test(fontFamily) || /italic|oblique/i.test(item.fontName || "");
          const x = e * 1.5;
          const baselineY = viewport.height - f * 1.5;
          const width = Math.max(4, Math.abs(item.width) * 1.5);
          const height = Math.max(fontSize * 1.25, Math.abs(item.height || fontSize) * 1.5);
          nextItems.push({
            id: `${pageNumber}-${index}-${Math.round(e)}-${Math.round(f)}`,
            page: pageNumber,
            text: item.str,
            originalText: item.str,
            x,
            y: baselineY - height,
            width,
            height,
            fontSize: fontSize * 1.5,
            style: { fontFamily, fontSize: fontSize * 1.5, color: "#111111", bold, italic },
          });
          void c; void d;
        });
      }
      setPreviews(nextPreviews);
      setItems(nextItems);
      setStatus("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "This PDF could not be opened.");
      setFile(null);
      setPdfBytes(null);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (id: string, text: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, text } : item));
  };

  const addText = () => {
    if (!currentPreview) return;
    const style = selectedItem?.style || DEFAULT_STYLE;
    const id = `new-${Date.now()}`;
    const item: TextItem = {
      id,
      page: currentPage,
      text: "Type your text",
      originalText: "",
      x: 70,
      y: 70,
      width: 180,
      height: style.fontSize * 1.5,
      fontSize: style.fontSize,
      style: { ...style },
    };
    setItems((current) => [...current, item]);
    setSelectedId(id);
    setTool("select");
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setItems((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const changeStyle = (patch: Partial<TextStyle>) => {
    if (!selectedId) return;
    setItems((current) => current.map((item) => item.id === selectedId ? { ...item, style: { ...item.style, ...patch }, fontSize: patch.fontSize ?? item.fontSize } : item));
  };

  const exportPdf = async () => {
    if (!pdfBytes || !file || !previews.length) return;
    setExporting(true); setError(""); setStatus("Building your edited PDF…");
    try {
      const source = await PDFDocument.load(pdfBytes);
      const output = await PDFDocument.create();
      const pages = source.getPages();
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        setStatus(`Exporting page ${pageIndex + 1} of ${pages.length}…`);
        const page = pages[pageIndex];
        const preview = previews[pageIndex];
        const baseImage = await output.embedJpg(preview.dataUrl);
        const outPage = output.addPage([page.getWidth(), page.getHeight()]);
        outPage.drawImage(baseImage, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });

        const pageEdited = items.filter((item) => item.page === pageIndex + 1 && item.text !== item.originalText);
        for (const item of pageEdited) {
          const pdfScale = page.getWidth() / preview.width;
          const x = item.x * pdfScale;
          const y = page.getHeight() - (item.y + item.height) * pdfScale;
          const fontSize = item.style.fontSize * pdfScale;
          const color = item.style.color;
          const rgb = /^#([0-9a-f]{6})$/i.exec(color);
          const r = rgb ? parseInt(rgb[1].slice(0, 2), 16) / 255 : 0.07;
          const g = rgb ? parseInt(rgb[1].slice(2, 4), 16) / 255 : 0.07;
          const b = rgb ? parseInt(rgb[1].slice(4, 6), 16) / 255 : 0.07;
          const { rgb: pdfRgb } = await import("pdf-lib");
          const font = await output.embedFont(item.style.bold ? "Helvetica-Bold" : item.style.italic ? "Helvetica-Oblique" : "Helvetica");
          outPage.drawRectangle({ x: x - 1, y: y - 1, width: Math.max(item.width * pdfScale + 4, 20), height: Math.max(item.height * pdfScale + 3, fontSize + 4), color: pdfRgb(1, 1, 1) });
          outPage.drawText(item.text, { x, y, size: Math.max(5, fontSize), font, color: pdfRgb(r, g, b) });
        }
      }
      const bytes = await output.save();
      const buffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(buffer).set(bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = `${file.name.replace(/\.pdf$/i, "")}-edited.pdf`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("✓ Your edited PDF has been downloaded.");
    } catch (err) {
      console.error(err); setError(err instanceof Error ? err.message : "Could not export the edited PDF."); setStatus("");
    } finally { setExporting(false); }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">✏️</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Edit PDF</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Edit text with styling detected from your PDF, add text, and export the result directly from your browser.</p>
        </div>

        <section className="mt-9 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,.07)]">
          {!file ? (
            <label className="m-5 flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center hover:border-blue-300 hover:bg-blue-50/30 sm:m-7">
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => openPdf(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span>
              <h2 className="mt-6 text-xl font-extrabold">Upload a PDF to edit</h2>
              <p className="mt-2 text-sm text-zinc-500">MakeUdocs will analyze the document and detect its text styling locally.</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose PDF →</span>
            </label>
          ) : (
            <div className="grid min-h-[720px] lg:grid-cols-[210px_1fr]">
              <aside className="border-b border-zinc-200 bg-zinc-50 p-4 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Pages</p><button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-blue-600">Change</button></div>
                <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => openPdf(e.target.files?.[0])} />
                <div className="mt-4 grid max-h-[620px] grid-cols-4 gap-2 overflow-auto lg:grid-cols-2">
                  {previews.map((preview) => <button key={preview.page} onClick={() => { setCurrentPage(preview.page); setSelectedId(null); }} className={`rounded-xl border-2 p-1.5 ${currentPage === preview.page ? "border-blue-500 bg-blue-50" : "border-zinc-200 bg-white"}`}><img src={preview.dataUrl} alt={`Page ${preview.page}`} className="w-full rounded-md" /><span className="mt-1 block text-[10px] font-bold text-zinc-500">{preview.page}</span></button>)}
                </div>
              </aside>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white p-3">
                  <button onClick={() => setTool("select")} className={`rounded-xl px-4 py-2 text-xs font-extrabold ${tool === "select" ? "bg-blue-600 text-white" : "border border-zinc-200 bg-white"}`}>↖ Select / Edit</button>
                  <button onClick={() => { setTool("add"); addText(); }} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-extrabold">T Add Text</button>
                  <button onClick={deleteSelected} disabled={!selectedId} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-extrabold disabled:opacity-40">Delete</button>
                  <div className="ml-auto flex items-center gap-2"><button onClick={() => setScale((v) => Math.max(.75, +(v - .1).toFixed(2)))} className="h-9 w-9 rounded-lg border">−</button><span className="w-12 text-center text-xs font-bold">{Math.round(scale * 100)}%</span><button onClick={() => setScale((v) => Math.min(1.6, +(v + .1).toFixed(2)))} className="h-9 w-9 rounded-lg border">+</button></div>
                </div>

                {selectedItem && <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/50 p-3">
                  <span className="text-xs font-extrabold text-blue-700">Detected style</span>
                  <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold">{selectedItem.style.fontFamily.split(",")[0]}</span>
                  <label className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold">Size <input type="number" min="5" max="96" value={Math.round(selectedItem.style.fontSize)} onChange={(e) => changeStyle({ fontSize: Number(e.target.value) || 12 })} className="w-12 border-0 p-0 text-xs font-bold outline-none" /></label>
                  <button onClick={() => changeStyle({ bold: !selectedItem.style.bold })} className={`rounded-lg px-3 py-1.5 text-xs font-black ${selectedItem.style.bold ? "bg-blue-600 text-white" : "bg-white"}`}>B</button>
                  <button onClick={() => changeStyle({ italic: !selectedItem.style.italic })} className={`rounded-lg px-3 py-1.5 text-xs font-black italic ${selectedItem.style.italic ? "bg-blue-600 text-white" : "bg-white"}`}>I</button>
                  <input type="color" value={selectedItem.style.color} onChange={(e) => changeStyle({ color: e.target.value })} title="Text color" className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-white p-1" />
                </div>}

                <div className="overflow-auto bg-slate-100 p-5 sm:p-8">
                  {loading ? <div className="flex min-h-[600px] items-center justify-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /><p className="mt-4 text-sm font-extrabold">{status || "Analyzing PDF…"}</p></div></div> : currentPreview ? <div ref={editorRef} className="relative mx-auto w-fit shadow-2xl">
                    <canvas ref={renderCanvasRef} className="block" />
                    {pageItems.map((item) => <div key={item.id} onClick={() => { setSelectedId(item.id); setTool("select"); }} className={`absolute cursor-text rounded-sm border ${selectedId === item.id ? "border-blue-500 bg-blue-100/30 ring-2 ring-blue-200" : "border-transparent hover:border-blue-300 hover:bg-blue-50/20"}`} style={{ left: item.x * scale, top: item.y * scale, width: Math.max(item.width * scale, 24), minHeight: Math.max(item.height * scale, 16) }}>
                      <textarea value={item.text} onChange={(e) => updateItem(item.id, e.target.value)} onFocus={() => setSelectedId(item.id)} spellCheck={false} className="h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none" style={{ fontFamily: item.style.fontFamily, fontSize: `${item.style.fontSize * scale}px`, fontWeight: item.style.bold ? 700 : 400, fontStyle: item.style.italic ? "italic" : "normal", color: item.style.color, lineHeight: 1.15 }} />
                    </div>)}
                  </div> : null}
                </div>

                <div className="flex flex-col gap-3 border-t border-zinc-200 bg-white p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 text-xs text-zinc-500">{status || `${pageCount} pages · ${items.length} text elements detected`}</div>
                  <button onClick={exportPdf} disabled={exporting || loading} className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg disabled:opacity-50">{exporting ? "Exporting…" : "Save Edited PDF →"}</button>
                </div>
              </div>
            </div>
          )}
          {error && <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-7">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔎</span><h3 className="mt-3 text-sm font-extrabold">Detects PDF text styling</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Existing text is analyzed for font family, size, weight, and style before editing.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✏️</span><h3 className="mt-3 text-sm font-extrabold">Edit in place</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Select text directly on the page and edit it where it appears.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Browser-local</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PDF stays in the browser while it is analyzed and processed.</p></div></section>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-zinc-400">Note: exported pages are visually reconstructed from the original PDF preview. This keeps the document appearance intact, while edited text uses the detected styling and browser-compatible font matching.</p>
      </div>
    </main>
  );
}
