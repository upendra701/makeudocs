"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { PDFDocument } from "pdf-lib";
import { WordUploader } from "./components/WordUploader";
import ToolSeoContent from "../components/ToolSeoContent";
import { useWordDocument } from "./hooks/useWordDocument";
import { useDocxRenderer } from "./hooks/useDocxRenderer";
import { usePdfConverter } from "./hooks/usePdfConverter";
import type { PdfResult } from "./types";


export default function WordToPdfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const editorHistoryRef = useRef<string[]>([]);
  const editorHistoryIndexRef = useRef(-1);
  const editorRestoringHistoryRef = useRef(false);
  const previewPanRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [isRendering, setIsRendering] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editorSelectionActive, setEditorSelectionActive] = useState(false);
  const [editorZoom, setEditorZoom] = useState(1);
  const [fileName, setFileName] = useState("");
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [docxHtml, setDocxHtml] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [pdfResult, setPdfResult] = useState<PdfResult | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");

  const { renderDocument } = useDocxRenderer();
  const { convertToPdf } = usePdfConverter();
  const { resetDocument } = useWordDocument();

  useEffect(() => {
    return () => {
      if (pdfResult) URL.revokeObjectURL(pdfResult.url);
    };
  }, [pdfResult]);

  function sanitizePdfFileName(value: string) {
    return value.trim().replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-");
  }

  function getPdfFileName() {
    const base = sanitizePdfFileName(pdfFileName || fileName || "document");
    return `${base || "document"}.pdf`;
  }

  async function handleFile(file: File) {
    setDocxFile(file);
    setFileName(file.name.replace(/\.docx$/i, ""));
    setPdfFileName(file.name.replace(/\.docx$/i, ""));
    setPdfResult(null);
    setIsRendering(true);
    try {
      const html = await renderDocument(file);
      setDocxHtml(html);
      setEditedHtml(html);
      editorHistoryRef.current = [html];
      editorHistoryIndexRef.current = 0;
    } finally {
      setIsRendering(false);
    }
  }

  async function handleConvert() {
    if (!docxFile || !editedHtml) return;
    setIsConverting(true);
    try {
      const result = await convertToPdf(editedHtml, fileName || docxFile.name);
      setPdfResult(result);
      setPdfFileName(sanitizePdfFileName(fileName || docxFile.name));
    } finally {
      setIsConverting(false);
    }
  }

  function downloadPdf() {
    if (!pdfResult) return;
    const anchor = document.createElement("a");
    anchor.href = pdfResult.url;
    anchor.download = getPdfFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function resetAll() {
    if (pdfResult) URL.revokeObjectURL(pdfResult.url);
    setPdfResult(null);
    setDocxFile(null);
    setFileName("");
    setPdfFileName("");
    setDocxHtml("");
    setEditedHtml("");
    setIsEditingText(false);
    setEditorSelectionActive(false);
    setEditorZoom(1);
    editorHistoryRef.current = [];
    editorHistoryIndexRef.current = -1;
    resetDocument();
  }

  function updateEditedHtml(nextHtml: string) {
    setEditedHtml(nextHtml);
    const history = editorHistoryRef.current;
    const nextIndex = editorHistoryIndexRef.current + 1;
    editorHistoryRef.current = history.slice(0, nextIndex).concat(nextHtml).slice(-30);
    editorHistoryIndexRef.current = Math.min(nextIndex, 29);
  }

  function undoEdit() {
    const index = editorHistoryIndexRef.current;
    if (index <= 0) return;
    editorHistoryIndexRef.current = index - 1;
    setEditedHtml(editorHistoryRef.current[editorHistoryIndexRef.current]);
  }

  function redoEdit() {
    const index = editorHistoryIndexRef.current;
    const history = editorHistoryRef.current;
    if (index < 0 || index >= history.length - 1) return;
    editorHistoryIndexRef.current = index + 1;
    setEditedHtml(history[editorHistoryIndexRef.current]);
  }

  function execCommand(command: string, value?: string) {
    document.execCommand(command, false, value);
    const editor = previewContainerRef.current?.querySelector<HTMLElement>("[contenteditable='true']");
    if (editor) updateEditedHtml(editor.innerHTML);
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Word to PDF Converter</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Convert DOCX files to PDF online for free. Preview your document, make supported edits, and download a submission-ready PDF directly in your browser.
          </p>
        </section>

        <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <WordUploader onFileSelected={handleFile} onReset={resetAll} fileName={fileName} />

          {isRendering && <p className="mt-4 text-sm font-medium text-zinc-600">Rendering your Word document…</p>}

          {docxHtml && !pdfResult && (
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold">Document preview</h2>
                  <p className="mt-1 text-xs text-zinc-500">Review the document before converting it to PDF.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={undoEdit} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">Undo</button>
                  <button type="button" onClick={redoEdit} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">Redo</button>
                  <button type="button" onClick={() => setEditorZoom((value) => Math.max(0.7, value - 0.1))} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">−</button>
                  <span className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold">{Math.round(editorZoom * 100)}%</span>
                  <button type="button" onClick={() => setEditorZoom((value) => Math.min(1.5, value + 0.1))} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">+</button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => execCommand("bold")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold">Bold</button>
                <button type="button" onClick={() => execCommand("italic")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold italic">Italic</button>
                <button type="button" onClick={() => execCommand("underline")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold underline">Underline</button>
                <button type="button" onClick={() => execCommand("justifyLeft")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">Left</button>
                <button type="button" onClick={() => execCommand("justifyCenter")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">Center</button>
                <button type="button" onClick={() => execCommand("justifyRight")} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold">Right</button>
              </div>

              <div ref={previewContainerRef} className="mt-4 overflow-auto rounded-2xl border border-zinc-200 bg-zinc-100 p-4">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => updateEditedHtml(event.currentTarget.innerHTML)}
                  onFocus={() => setIsEditingText(true)}
                  onBlur={() => setIsEditingText(false)}
                  className="mx-auto min-h-[800px] w-full max-w-[794px] bg-white p-10 shadow-sm outline-none"
                  style={{ transform: `scale(${editorZoom})`, transformOrigin: "top center" }}
                  dangerouslySetInnerHTML={{ __html: editedHtml }}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={handleConvert} disabled={isConverting} className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {isConverting ? "Converting…" : "Convert to PDF"}
                </button>
                <button type="button" onClick={resetAll} className="flex-1 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50">Start Over</button>
              </div>
            </div>
          )}

          {pdfResult && (
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">✓</div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-zinc-900">PDF Ready</h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">{getPdfFileName()}</p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                <iframe src={pdfResult.url} title="PDF Preview" className="h-[65vh] min-h-[450px] w-full" />
              </div>

              <div className="mt-5">
                <label htmlFor="pdf-file-name" className="mb-2 block text-sm font-semibold text-zinc-800">PDF file name</label>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <input id="pdf-file-name" type="text" value={pdfFileName} onChange={(e) => setPdfFileName(e.target.value)} onBlur={() => setPdfFileName(sanitizePdfFileName(pdfFileName))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); downloadPdf(); } }} placeholder="Enter PDF file name" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400" />
                  <div className="flex items-center border-l border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-500">.pdf</div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={downloadPdf} disabled={!sanitizePdfFileName(pdfFileName)} className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">⬇️ Download PDF</button>
                <button type="button" onClick={() => { if (pdfResult) URL.revokeObjectURL(pdfResult.url); setPdfResult(null); setPdfFileName(""); }} className="flex-1 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.99]">Edit / Convert Again</button>
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          <strong>MakeUdocs:</strong> Your Word document is processed locally in the browser.
        </div>

        <div className="mx-auto max-w-5xl pb-12">
          <ToolSeoContent
            intro="MakeUdocs Word to PDF converts DOCX documents into PDF directly in your browser. You can preview the Word document, make supported edits, create an A4 PDF, review the generated result, and download the finished file."
            benefits={[
              "Convert supported DOCX documents to PDF online for free.",
              "Preview your Word document before conversion.",
              "Make supported text and formatting edits before creating the PDF.",
              "Generate A4 PDF pages across multi-page documents.",
              "Review the generated PDF before downloading it.",
              "Process the conversion directly in your browser.",
            ]}
            steps={[
              "Select a DOCX file from your device.",
              "Review the rendered document and make any supported edits.",
              "Click Convert to PDF to generate the A4 PDF.",
              "Review the PDF preview, choose a file name, and download it.",
            ]}
            faq={[
              { question: "Can I convert Word to PDF for free?", answer: "Yes. MakeUdocs provides a free Word to PDF converter for supported DOCX documents." },
              { question: "Can I convert a DOCX file to PDF?", answer: "Yes. The current Word to PDF tool accepts DOCX files and converts them into PDF documents." },
              { question: "Do I need Microsoft Word installed?", answer: "No. You can upload a supported DOCX document through your web browser and convert it to PDF with MakeUdocs." },
              { question: "Can I create an A4 PDF from a Word document?", answer: "Yes. The Word to PDF workflow generates A4 PDF pages and handles document pagination across multiple pages." },
              { question: "Will my document formatting be preserved?", answer: "MakeUdocs renders the Word document before creating the PDF and is designed to preserve the document layout and formatting." },
            ]}
            related={[
              { name: "Image to PDF", href: "/image-to-pdf" },
              { name: "Compress PDF", href: "/compress-pdf" },
              { name: "Merge PDF", href: "/merge-pdf" },
              { name: "PDF to Images", href: "/pdf-to-images" },
              { name: "Passport Photo Maker", href: "/passport-photo" },
            ]}
          />
        </div>
      </div>
    </main>
  );
}
