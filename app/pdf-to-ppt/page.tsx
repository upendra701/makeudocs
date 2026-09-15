"use client";

import { ChangeEvent, DragEvent, useState } from "react";

type PptxPresentation = {
  layout: string;
  author: string;
  subject: string;
  title: string;
  company: string;
  addSlide: () => { addImage: (options: { data: string; x: number; y: number; w: number; h: number }) => void };
  writeFile: (options: { fileName: string }) => Promise<void>;
};

declare global {
  interface Window {
    PptxGenJS?: new () => PptxPresentation;
  }
}

const loadPptxGen = async () => {
  if (typeof window === "undefined") throw new Error("PowerPoint export is only available in a browser.");
  if (window.PptxGenJS) return window.PptxGenJS;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-makeudocs-pptxgen]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("PowerPoint export library could not be loaded.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs/dist/pptxgen.bundle.js";
    script.async = true;
    script.dataset.makeudocsPptxgen = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PowerPoint export library could not be loaded."));
    document.head.appendChild(script);
  });
  if (!window.PptxGenJS) throw new Error("PowerPoint export library is unavailable.");
  return window.PptxGenJS;
};

const canvasToDataUrl = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("A PDF page could not be rendered as an image.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("A PDF page image could not be prepared."));
    reader.readAsDataURL(blob);
  });
};

export default function PdfToPptPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const isPdf = nextFile.type === "application/pdf" || nextFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setError("Please choose a PDF file."); return; }
    setFile(nextFile); setProgress(0); setError("");
  };
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); };
  const reset = () => { setFile(null); setProgress(0); setError(""); };

  const convert = async () => {
    if (!file) return;
    setIsConverting(true); setProgress(0); setError("");
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/build/pdf.worker.min.mjs";
      const PptxGenJS = await loadPptxGen();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      pptx.author = "MakeUdocs";
      pptx.company = "MakeUdocs";
      pptx.subject = "PDF to PowerPoint conversion";
      pptx.title = file.name.replace(/\.pdf$/i, "");

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const slideWidth = 13.333;
        const slideHeight = 7.5;
        const scale = Math.min((slideWidth * 96) / baseViewport.width, (slideHeight * 96) / baseViewport.height);
        const viewport = page.getViewport({ scale: Math.max(1, scale) });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error(`Could not render PDF page ${pageNumber}.`);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const data = await canvasToDataUrl(canvas);
        const slide = pptx.addSlide();
        const imageRatio = viewport.width / viewport.height;
        const slideRatio = slideWidth / slideHeight;
        let width = slideWidth;
        let height = slideHeight;
        let x = 0;
        let y = 0;
        if (imageRatio > slideRatio) {
          height = width / imageRatio;
          y = (slideHeight - height) / 2;
        } else {
          width = height * imageRatio;
          x = (slideWidth - width) / 2;
        }
        slide.addImage({ data, x, y, w: width, h: height });
        setProgress(Math.round((pageNumber / pdf.numPages) * 100));
        page.cleanup();
        canvas.width = 1;
        canvas.height = 1;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await pptx.writeFile({ fileName: `${file.name.replace(/\.pdf$/i, "") || "makeudocs-pdf"}-converted.pptx` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The PDF could not be converted to PowerPoint.");
    } finally { setIsConverting(false); }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(219,234,254,.72),transparent_34rem),linear-gradient(180deg,#f8fbff_0%,#f8fafc_45%,#fff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mx-auto max-w-3xl text-center"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> High-fidelity slide conversion</div><h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">PDF to PowerPoint</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">Turn each PDF page into a presentation slide while preserving the original visual layout. Your PDF is processed in your browser.</p></section>
        <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-8">
          {!file ? <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-6 py-14 text-center transition hover:border-blue-400 hover:bg-blue-50"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200">↗</div><h2 className="mt-5 text-xl font-semibold text-zinc-900">Upload a PDF</h2><p className="mt-2 text-sm text-zinc-500">Drag and drop your PDF here, or choose a file from your device.</p><label className="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">Choose PDF<input type="file" accept="application/pdf,.pdf" onChange={handleInput} className="hidden" /></label></div> : <div><div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-semibold text-zinc-900">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><button onClick={reset} disabled={isConverting} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">Choose another</button></div>
          {isConverting && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center justify-between text-sm font-medium text-blue-900"><span>Converting PDF pages…</span><span>{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div></div>}
          {!isConverting && <button onClick={convert} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">Convert to PowerPoint</button>}
        </div>}
          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</div>}
        </section>
        <section className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">{[["One page = one slide","Each PDF page becomes a PowerPoint slide."],["Visual fidelity","Text, graphics, tables, and layout stay visually together."],["Browser processing","PDF pages are rendered and packaged locally in your browser."]].map(([title, text]) => <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="font-semibold text-zinc-900">{title}</p><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>)}</section>
        <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-5 text-zinc-400">This high-fidelity mode places each PDF page on a slide as an image. The visual content is preserved, but individual PDF text elements are not separately editable in PowerPoint.</p>
      </div>
    </main>
  );
}
