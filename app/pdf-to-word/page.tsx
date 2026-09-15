"use client";

import { useRef, useState } from "react";

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const u16 = (v: number) => new Uint8Array([v & 255, (v >>> 8) & 255]);
const u32 = (v: number) => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
function join(parts: Uint8Array[]) { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }

function createDocx(pages: Uint8Array[]) {
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const relationships: string[] = [];
  const contentOverrides: string[] = [];
  const body: string[] = [];
  const a4Width = 11906;
  const a4Height = 16838;

  pages.forEach((image, index) => {
    const n = index + 1;
    files.push({ name: `word/media/page${n}.png`, data: image });
    relationships.push(`<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${n}.png"/>`);
    contentOverrides.push(`<Override PartName="/word/media/page${n}.png" ContentType="image/png"/>`);
    body.push(`<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${a4Width * 635}" cy="${a4Height * 635}"/><wp:docPr id="${n}" name="PDF page ${n}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="page${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${n}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${a4Width * 635}" cy="${a4Height * 635}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>${index < pages.length - 1 ? "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>" : ""}`);
  });

  const add = (name: string, text: string) => files.push({ name, data: enc.encode(text) });
  add("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${contentOverrides.join("")}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  add("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  add("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`);
  add("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`);
  add("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>PDF to Word — MakeUdocs</dc:title><dc:creator>MakeUdocs</dc:creator></cp:coreProperties>`);
  add("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="${a4Width}" w:h="${a4Height}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0"/></w:sectPr></w:body></w:document>`);

  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name), crc = crc32(file.data);
    const localPart = join([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data]);
    const centralPart = join([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    local.push(localPart); central.push(centralPart); offset += localPart.length;
  }
  const localData = join(local), centralData = join(central);
  return join([localData, centralData, join([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(localData.length), u16(0)])]);
}

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState("");

  const convert = async (selected: File) => {
    setBusy(true); setError(""); setProgress(5); setPages(0);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await selected.arrayBuffer()) }).promise;
      const rendered: Uint8Array[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.7 });
        const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not create the PDF preview canvas.");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("Could not render a PDF page.");
        rendered.push(new Uint8Array(await blob.arrayBuffer()));
        setPages(i); setProgress(Math.round((i / pdf.numPages) * 88));
      }
      const docx = createDocx(rendered);
      const blob = new Blob([docx], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${selected.name.replace(/\.pdf$/i, "")}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setProgress(100);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong while converting the PDF."); }
    finally { setBusy(false); }
  };

  const choose = (next: File | undefined) => { if (!next) return; if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setError("Please select a PDF file."); return; } setFile(next); setError(""); setProgress(0); setPages(0); };

  return <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:py-14"><div className="mx-auto max-w-5xl"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">📄</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Convert</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">PDF to Word Converter</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Convert your PDF into a Word document while preserving the original page appearance.</p></div>
  <section className="mt-10 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">{!file ? <label htmlFor="pdf-to-word-file" className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30"><input ref={inputRef} id="pdf-to-word-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span><h2 className="mt-6 text-xl font-extrabold text-zinc-950">Select a PDF</h2><p className="mt-2 text-sm text-zinc-500">Your Word file will keep each original PDF page as a high-quality image.</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose PDF →</span></label> : <div className="space-y-5"><div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">📄</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-zinc-900">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p></div></div><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button><input ref={inputRef} id="pdf-to-word-file-replace" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])}/></div><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-extrabold">Preserve original layout</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Each PDF page is placed into Word at the same page size, so the design, spacing, columns, lines and images stay visually intact.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm">High fidelity</span></div><button type="button" onClick={() => convert(file)} disabled={busy} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,.2)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{busy ? `Converting… ${progress}%` : "Convert to Word →"}</button>{busy && <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div>}{progress === 100 && !busy && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">✓ Word document created with {pages} original page{pages === 1 ? "" : "s"} preserved.</div>}</div></div>}{error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}</section>
  <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🎯</span><h3 className="mt-3 text-sm font-extrabold">Original appearance</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Keeps the visual layout, typography, spacing and graphics of each PDF page.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Rendering happens locally in your browser.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📄</span><h3 className="mt-3 text-sm font-extrabold">One Word page per PDF page</h3><p className="mt-1 text-xs leading-5 text-zinc-500">The resulting document follows the original PDF page structure.</p></div></section><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><strong>Important:</strong> This high-fidelity mode preserves the appearance exactly by placing each PDF page into Word as an image. The page content is not individually editable as Word text.</div></div></main>;
}
