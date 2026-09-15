"use client";

import { useRef, useState } from "react";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function concat(parts: Uint8Array[]) { const total = parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(total); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; }

function createDocx(paragraphs: string[]) {
  const encoder = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`) },
    { name: "_rels/.rels", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`) },
    { name: "word/styles.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style></w:styles>`) },
    { name: "docProps/core.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Converted PDF</dc:title><dc:creator>MakeUdocs</dc:creator></cp:coreProperties>`) },
    { name: "word/document.xml", data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${esc(p || " ")}</w:t></w:r></w:p>`).join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`) },
  ];

  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name); const crc = crc32(file.data);
    local.push(concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data]));
    central.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += local[local.length - 1].length;
  }
  const centralData = concat(central); const localData = concat(local);
  return concat([localData, centralData, concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(localData.length), u16(0)])]);
}

export default function PdfToWordPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState(0);
  const [paragraphs, setParagraphs] = useState(0);
  const [error, setError] = useState("");

  const convert = async (selected: File) => {
    setBusy(true); setError(""); setProgress(5); setPages(0); setParagraphs(0);
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const data = new Uint8Array(await selected.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;
      const extracted: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const items = content.items as Array<{ str?: string; transform?: number[] }>;
        let line = ""; let lastY: number | null = null;
        for (const item of items) {
          const text = item.str ?? ""; const y = item.transform?.[5] ?? null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 4 && line.trim()) { extracted.push(line.trim()); line = ""; }
          if (text) line += (line && !line.endsWith(" ") ? " " : "") + text;
          if (y !== null) lastY = y;
        }
        if (line.trim()) extracted.push(line.trim());
        setPages(i); setProgress(Math.round((i / pdf.numPages) * 85));
      }
      if (!extracted.length) throw new Error("No selectable text was found in this PDF. Scanned PDFs need OCR before they can be converted to editable Word text.");
      setParagraphs(extracted.length);
      const docx = createDocx(extracted);
      const blob = new Blob([docx], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = `${selected.name.replace(/\.pdf$/i, "")}.docx`; a.click(); URL.revokeObjectURL(url);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while converting the PDF.");
    } finally { setBusy(false); }
  };

  const choose = (next: File | undefined) => {
    if (!next) return; if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setError("Please select a PDF file."); return; }
    setFile(next); setError(""); setProgress(0); setPages(0); setParagraphs(0);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">📄</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Convert</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">PDF to Word Converter</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Turn selectable PDF text into an editable Word document directly in your browser.</p>
        </div>

        <section className="mt-10 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label htmlFor="pdf-to-word-file" className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/30">
              <input ref={inputRef} id="pdf-to-word-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span>
              <h2 className="mt-6 text-xl font-extrabold text-zinc-950">Select a PDF</h2>
              <p className="mt-2 text-sm text-zinc-500">Choose a text-based PDF to convert into an editable Word file.</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose PDF →</span>
            </label>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">📄</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-zinc-900">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · PDF</p></div></div>
                <div className="flex gap-2"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button><input ref={inputRef} id="pdf-to-word-file" type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => choose(e.target.files?.[0])} /></div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-center justify-between"><div><h2 className="text-base font-extrabold">Ready to convert</h2><p className="mt-1 text-xs text-zinc-500">Text, headings and paragraphs will be placed into an editable .docx file.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-600 shadow-sm">Browser-only</span></div>
                <button type="button" onClick={() => convert(file)} disabled={busy} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,.2)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70">{busy ? `Converting… ${progress}%` : "Convert to Word →"}</button>
                {busy && <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>}
              </div>

              {progress === 100 && !busy && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-extrabold text-emerald-800">✓ Word document created</p><p className="mt-1 text-sm text-emerald-700">Processed {pages} page{pages === 1 ? "" : "s"} and extracted {paragraphs} text blocks. Your .docx download should be in your downloads folder.</p></div>}
            </div>
          )}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PDF is processed locally in your browser.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">⚡</span><h3 className="mt-3 text-sm font-extrabold">Fast extraction</h3><p className="mt-1 text-xs leading-5 text-zinc-500">No upload queue or server processing for text PDFs.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✎</span><h3 className="mt-3 text-sm font-extrabold">Editable output</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Get a standard DOCX file you can open and edit in Word.</p></div>
        </section>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><strong>Note:</strong> This first browser-only version extracts selectable text. Scanned/image-only PDFs require OCR and may not preserve the original visual layout, tables or images.</div>
      </div>
    </main>
  );
}
