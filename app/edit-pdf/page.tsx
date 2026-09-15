"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useEffect, useRef, useState } from "react";

type TextStyle = { fontFamily: string; fontSize: number; color: string; bold: boolean; italic: boolean };
type TextItem = { id: string; page: number; text: string; originalText: string; x: number; y: number; width: number; height: number; style: TextStyle };
type PagePreview = { page: number; dataUrl: string; width: number; height: number };

const DEFAULT_STYLE: TextStyle = { fontFamily: "Arial, sans-serif", fontSize: 12, color: "#111111", bold: false, italic: false };

function fontFamily(value: string) {
  const clean = (value || "Arial").replace(/["']/g, "").trim();
  const lower = clean.toLowerCase();
  if (lower.includes("arial")) return "Arial, sans-serif";
  if (lower.includes("helvetica")) return "Helvetica, Arial, sans-serif";
  if (lower.includes("times")) return "Times New Roman, Times, serif";
  if (lower.includes("courier")) return "Courier New, Courier, monospace";
  if (lower.includes("georgia")) return "Georgia, serif";
  return `${clean}, Arial, sans-serif`;
}

function pdfFont(style: TextStyle) {
  if (/courier/i.test(style.fontFamily)) return style.bold ? StandardFonts.CourierBold : style.italic ? StandardFonts.CourierOblique : StandardFonts.Courier;
  if (/times/i.test(style.fontFamily)) return style.bold ? (style.italic ? StandardFonts.TimesRomanBoldItalic : StandardFonts.TimesRomanBold) : style.italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman;
  return style.bold ? (style.italic ? StandardFonts.HelveticaBoldOblique : StandardFonts.HelveticaBold) : style.italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
}

function textColor(value: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(value);
  return m ? rgb(parseInt(m[1].slice(0, 2), 16) / 255, parseInt(m[1].slice(2, 4), 16) / 255, parseInt(m[1].slice(4, 6), 16) / 255) : rgb(0.07, 0.07, 0.07);
}

export default function EditPdfPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [items, setItems] = useState<TextItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1.05);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const preview = previews.find((p) => p.page === currentPage);
  const pageItems = items.filter((item) => item.page === currentPage);
  const selected = items.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    const width = preview.width * zoom;
    const height = preview.height * zoom;
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = new Image();
    image.onload = () => { ctx.clearRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height); };
    image.src = preview.dataUrl;
  }, [preview, zoom]);

  const openPdf = async (next?: File) => {
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setError("Please select a PDF file."); return; }
    setLoading(true); setError(""); setStatus("Reading your PDF locally…"); setFile(next); setSelectedId(null); setItems([]); setPreviews([]); setCurrentPage(1);
    const bytes = await next.arrayBuffer(); setSourceBytes(bytes);
    try {
      const pdfjs = await import("pdfjs-dist");
      const base = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/`;
      pdfjs.GlobalWorkerOptions.workerSrc = `${base}build/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useWasm: true, wasmUrl: `${base}wasm/`, useWorkerFetch: true, isImageDecoderSupported: false }).promise;
      setPageCount(pdf.numPages);
      const nextPreviews: PagePreview[] = [];
      const nextItems: TextItem[] = [];

      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        setStatus(`Analyzing page ${pageNo} of ${pdf.numPages}…`);
        const page = await pdf.getPage(pageNo);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) throw new Error("Unable to create PDF preview.");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        nextPreviews.push({ page: pageNo, dataUrl: canvas.toDataURL("image/jpeg", 0.9), width: viewport.width, height: viewport.height });

        const content = await page.getTextContent({ includeMarkedContent: false });
        const styles = content.styles as Record<string, { fontFamily?: string }>;
        content.items.forEach((raw: unknown, index) => {
          if (!("str" in (raw as object))) return;
          const rawItem = raw as { str: string; transform: number[]; width: number; height: number; fontName?: string };
          if (!rawItem.str.trim()) return;
          const transformed = pdfjs.Util.transform(viewport.transform, rawItem.transform);
          const fontH = Math.max(7, Math.hypot(transformed[2], transformed[3]));
          const x = transformed[4];
          const y = transformed[5] - fontH;
          const width = Math.max(8, Math.abs(rawItem.width) * viewport.scale);
          const info = styles[rawItem.fontName || ""] || {};
          const family = fontFamily(info.fontFamily || rawItem.fontName || "Arial");
          const name = `${info.fontFamily || ""} ${rawItem.fontName || ""}`;
          const bold = /bold|black|heavy|semibold/i.test(name);
          const italic = /italic|oblique/i.test(name);
          nextItems.push({
            id: `${pageNo}-${index}-${Math.round(x)}-${Math.round(y)}`,
            page: pageNo,
            text: rawItem.str,
            originalText: rawItem.str,
            x,
            y,
            width,
            height: fontH * 1.2,
            style: { fontFamily: family, fontSize: fontH, color: "#111111", bold, italic },
          });
        });
      }
      setPreviews(nextPreviews); setItems(nextItems); setStatus("");
    } catch (err) {
      console.error(err); setError(err instanceof Error ? err.message : "This PDF could not be opened."); setFile(null); setSourceBytes(null); setPreviews([]); setItems([]);
    } finally { setLoading(false); }
  };

  const updateText = (id: string, text: string) => setItems((all) => all.map((item) => item.id === id ? { ...item, text } : item));
  const updateStyle = (patch: Partial<TextStyle>) => { if (selectedId) setItems((all) => all.map((item) => item.id === selectedId ? { ...item, style: { ...item.style, ...patch } } : item)); };

  const addText = () => {
    if (!preview) return;
    const style = selected?.style || DEFAULT_STYLE;
    const id = `new-${Date.now()}`;
    setItems((all) => [...all, { id, page: currentPage, text: "Type your text", originalText: "", x: 70, y: 70, width: 190, height: style.fontSize * 1.2, style: { ...style } }]);
    setSelectedId(id);
  };

  const deleteSelected = () => { if (!selectedId) return; setItems((all) => all.filter((item) => item.id !== selectedId)); setSelectedId(null); };

  const exportPdf = async () => {
    if (!sourceBytes || !file || !previews.length) return;
    setExporting(true); setError(""); setStatus("Creating edited PDF…");
    try {
      const source = await PDFDocument.load(sourceBytes);
      const output = await PDFDocument.create();
      for (let i = 0; i < source.getPageCount(); i++) {
        setStatus(`Exporting page ${i + 1} of ${source.getPageCount()}…`);
        const src = source.getPage(i); const p = previews[i];
        const out = output.addPage([src.getWidth(), src.getHeight()]);
        const image = await output.embedJpg(p.dataUrl);
        out.drawImage(image, { x: 0, y: 0, width: src.getWidth(), height: src.getHeight() });
        const pageScale = src.getWidth() / p.width;
        const edited = items.filter((item) => item.page === i + 1 && item.text !== item.originalText);
        for (const item of edited) {
          const x = item.x * pageScale;
          const y = src.getHeight() - (item.y + item.height) * pageScale;
          const size = Math.max(5, item.style.fontSize * pageScale);
          const coverW = Math.min(src.getWidth() - Math.max(0, x - 2), Math.max(item.width * pageScale + 6, 24));
          const coverH = Math.min(src.getHeight() - Math.max(0, y - 2), Math.max(item.height * pageScale + 6, size + 5));
          out.drawRectangle({ x: Math.max(0, x - 2), y: Math.max(0, y - 2), width: coverW, height: coverH, color: rgb(1, 1, 1) });
          const font = await output.embedFont(pdfFont(item.style));
          out.drawText(item.text, { x, y, size, font, color: textColor(item.style.color) });
        }
      }
      const bytes = await output.save();
      const buffer = new ArrayBuffer(bytes.byteLength); new Uint8Array(buffer).set(bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url; a.download = `${file.name.replace(/\.pdf$/i, "")}-edited.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("✓ Edited PDF downloaded successfully.");
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Could not export the edited PDF."); setStatus(""); }
    finally { setExporting(false); }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">✏️</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs PDF Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Edit PDF</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Click text on the page to edit it. MakeUdocs maps the PDF's real text coordinates and carries its detected font family, size, weight and style into the editor.</p></div>
        <section className="mt-9 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,.07)]">
          {!file ? <label className="m-5 flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center hover:border-blue-300 hover:bg-blue-50/30 sm:m-7"><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e)=>openPdf(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span><h2 className="mt-6 text-xl font-extrabold">Upload a PDF to edit</h2><p className="mt-2 text-sm text-zinc-500">The document is analyzed locally before editing.</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose PDF →</span></label> : <div className="grid min-h-[720px] lg:grid-cols-[210px_1fr]">
            <aside className="border-b border-zinc-200 bg-zinc-50 p-4 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Pages</p><button onClick={()=>inputRef.current?.click()} className="text-xs font-bold text-blue-600">Change</button></div><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e)=>openPdf(e.target.files?.[0])}/><div className="mt-4 grid max-h-[620px] grid-cols-4 gap-2 overflow-auto lg:grid-cols-2">{previews.map((p)=><button key={p.page} onClick={()=>{setCurrentPage(p.page);setSelectedId(null);}} className={`rounded-xl border-2 p-1.5 ${currentPage===p.page?"border-blue-500 bg-blue-50":"border-zinc-200 bg-white"}`}><img src={p.dataUrl} alt={`Page ${p.page}`} className="w-full rounded-md"/><span className="mt-1 block text-[10px] font-bold text-zinc-500">{p.page}</span></button>)}</div></aside>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white p-3"><button onClick={()=>setSelectedId(null)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white">↖ Select / Edit</button><button onClick={addText} disabled={loading} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-extrabold">T Add Text</button><button onClick={deleteSelected} disabled={!selectedId} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-extrabold disabled:opacity-40">Delete</button><div className="ml-auto flex items-center gap-2"><button onClick={()=>setZoom(z=>Math.max(.75,+(z-.1).toFixed(2)))} className="h-9 w-9 rounded-lg border">−</button><span className="w-12 text-center text-xs font-bold">{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(1.6,+(z+.1).toFixed(2)))} className="h-9 w-9 rounded-lg border">+</button></div></div>
              {selected && <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50/60 p-3"><span className="text-xs font-extrabold text-blue-700">Detected style</span><span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold">{selected.style.fontFamily.split(",")[0]}</span><label className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold">Size <input type="number" min="5" max="96" value={Math.round(selected.style.fontSize)} onChange={(e)=>updateStyle({fontSize:Number(e.target.value)||12})} className="w-12 border-0 p-0 text-xs font-bold outline-none"/></label><button onClick={()=>updateStyle({bold:!selected.style.bold})} className={`rounded-lg px-3 py-1.5 text-xs font-black ${selected.style.bold?"bg-blue-600 text-white":"bg-white"}`}>B</button><button onClick={()=>updateStyle({italic:!selected.style.italic})} className={`rounded-lg px-3 py-1.5 text-xs font-black italic ${selected.style.italic?"bg-blue-600 text-white":"bg-white"}`}>I</button><input type="color" value={selected.style.color} onChange={(e)=>updateStyle({color:e.target.value})} className="h-8 w-10 rounded-lg border bg-white p-1"/></div>}
              <div className="overflow-auto bg-slate-100 p-5 sm:p-8">{loading ? <div className="flex min-h-[600px] items-center justify-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"/><p className="mt-4 text-sm font-extrabold">{status||"Analyzing PDF…"}</p></div></div> : preview ? <div className="mx-auto w-fit shadow-2xl"><div className="relative"><canvas ref={canvasRef} className="block"/>{pageItems.map((item)=>{const active=selectedId===item.id; const changed=item.text!==item.originalText; return <div key={item.id} onClick={()=>setSelectedId(item.id)} className={`absolute rounded-sm ${active?"z-20 border-2 border-blue-500 ring-2 ring-blue-200":"z-10 border border-transparent hover:border-blue-300"}`} style={{left:item.x*zoom,top:item.y*zoom,width:Math.max(item.width*zoom,28),height:Math.max(item.height*zoom,18)}}>{active||changed ? <textarea autoFocus={active} value={item.text} onChange={(e)=>updateText(item.id,e.target.value)} onFocus={()=>setSelectedId(item.id)} spellCheck={false} className="block h-full w-full resize-none overflow-hidden rounded-[2px] border-0 bg-white px-0.5 py-0 outline-none" style={{fontFamily:item.style.fontFamily,fontSize:`${item.style.fontSize*zoom}px`,fontWeight:item.style.bold?700:400,fontStyle:item.style.italic?"italic":"normal",color:item.style.color,lineHeight:1.1}}/> : <span className="block h-full w-full cursor-text bg-transparent"/>}</div>})}</div></div> : null}</div>
              <div className="flex flex-col gap-3 border-t border-zinc-200 bg-white p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1 text-xs text-zinc-500">{status||`${pageCount} pages · ${items.length} text elements detected`}</div><button onClick={exportPdf} disabled={exporting||loading||!previews.length} className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg disabled:opacity-50">{exporting?"Exporting…":"Save Edited PDF →"}</button></div>
            </div></div>}
          {error&&<div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-7">{error}</div>}
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🎯</span><h3 className="mt-3 text-sm font-extrabold">Accurate text mapping</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Text boxes use PDF.js viewport coordinates instead of guessed positions.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔤</span><h3 className="mt-3 text-sm font-extrabold">Detected styling</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Existing font family, size, weight and italic style are carried into editing.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">The PDF stays in your browser while it is analyzed and exported.</p></div></section>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-zinc-400">PDFs with embedded or custom fonts may require a compatible fallback font because the browser/PDF export engine cannot always reuse the original embedded font directly.</p>
      </div>
    </main>
  );
}
