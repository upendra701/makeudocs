"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";

type Cell = string;
type Row = Cell[];
type SheetPreview = {
  page: number;
  rows: Row[];
};

declare global {
  interface Window {
    XLSX?: {
      utils: {
        book_new: () => unknown;
        aoa_to_sheet: (data: unknown[][]) => unknown;
        book_append_sheet: (workbook: unknown, sheet: unknown, name: string) => void;
      };
      writeFile: (workbook: unknown, filename: string) => void;
    };
  }
}

const loadXlsx = async () => {
  if (typeof window === "undefined") throw new Error("Excel export is only available in a browser.");
  if (window.XLSX) return window.XLSX;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-makeudocs-xlsx]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Excel export library could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.async = true;
    script.dataset.makeudocsXlsx = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Excel export library could not be loaded."));
    document.head.appendChild(script);
  });

  if (!window.XLSX) throw new Error("Excel export library is unavailable.");
  return window.XLSX;
};

const cleanText = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const extractPageRows = (items: Array<{ str: string; transform: number[]; width?: number }>): Row[] => {
  const tokens = items
    .map((item) => ({
      text: cleanText(item.str),
      x: Number(item.transform?.[4] ?? 0),
      y: Number(item.transform?.[5] ?? 0),
      width: Math.max(Number(item.width ?? 0), 1),
    }))
    .filter((item) => item.text);

  if (!tokens.length) return [];

  const heights = tokens.map((item) => Math.abs(Number(item.transform?.[0] ?? 0)) || 10);
  const lineTolerance = Math.max(3, median(heights) * 0.65);
  const lines: Array<typeof tokens> = [];

  for (const token of [...tokens].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((candidate) => Math.abs(candidate[0].y - token.y) <= lineTolerance);
    if (line) line.push(token);
    else lines.push([token]);
  }

  const normalizedLines = lines
    .map((line) => [...line].sort((a, b) => a.x - b.x))
    .sort((a, b) => b[0].y - a[0].y)
    .map((line) => {
      const cells: Array<{ x: number; text: string }> = [];
      for (const token of line) {
        const previous = cells[cells.length - 1];
        const gap = previous ? token.x - (previous.x + previous.text.length * 4) : Infinity;
        if (previous && gap < Math.max(10, token.width * 0.55)) {
          previous.text = `${previous.text} ${token.text}`.trim();
        } else {
          cells.push({ x: token.x, text: token.text });
        }
      }
      return cells;
    });

  const maxColumns = Math.max(...normalizedLines.map((line) => line.length));
  if (maxColumns <= 1) {
    return normalizedLines.map((line) => [line.map((cell) => cell.text).join(" ")]);
  }

  // Align cells into columns using the recurring x positions found on the page.
  const xPositions = normalizedLines
    .flatMap((line) => line.map((cell) => cell.x))
    .sort((a, b) => a - b);
  const clusters: number[] = [];
  const xTolerance = Math.max(14, median(heights) * 1.6);
  for (const x of xPositions) {
    const last = clusters[clusters.length - 1];
    if (last === undefined || Math.abs(x - last) > xTolerance) clusters.push(x);
    else clusters[clusters.length - 1] = (last + x) / 2;
  }

  return normalizedLines.map((line) => {
    const row = Array.from({ length: clusters.length }, () => "");
    for (const cell of line) {
      let nearest = 0;
      let distance = Infinity;
      clusters.forEach((cluster, index) => {
        const d = Math.abs(cluster - cell.x);
        if (d < distance) {
          distance = d;
          nearest = index;
        }
      });
      row[nearest] = row[nearest] ? `${row[nearest]} ${cell.text}` : cell.text;
    }
    return row.map(cleanText);
  });
};

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SheetPreview[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const totalRows = useMemo(() => preview.reduce((sum, page) => sum + page.rows.length, 0), [preview]);

  const chooseFile = (nextFile?: File) => {
    if (!nextFile) return;
    const isPdf = nextFile.type === "application/pdf" || nextFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      return;
    }
    setFile(nextFile);
    setPreview([]);
    setError("");
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    chooseFile(event.dataTransfer.files?.[0]);
  };

  const extract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setProgress(0);
    setError("");

    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data }).promise;
      const pages: SheetPreview[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const rows = extractPageRows(
          content.items.filter((item): item is typeof item & { str: string; transform: number[] } =>
            "str" in item && "transform" in item
          )
        );
        if (rows.length) pages.push({ page: pageNumber, rows });
        setProgress(Math.round((pageNumber / pdf.numPages) * 100));
        page.cleanup();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (!pages.length) {
        throw new Error("No selectable text or table data was found in this PDF. Scanned PDFs need OCR before their tables can be extracted.");
      }

      setPreview(pages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The PDF could not be processed.");
      setPreview([]);
    } finally {
      setIsExtracting(false);
    }
  };

  const exportExcel = async () => {
    if (!preview.length) return;
    setIsExporting(true);
    setError("");
    try {
      const XLSX = await loadXlsx();
      const workbook = XLSX.utils.book_new();
      preview.forEach((page, index) => {
        const rows = page.rows.map((row) => row.map((cell) => cell || ""));
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, `Page ${index + 1}`.slice(0, 31));
      });
      const base = file?.name.replace(/\.pdf$/i, "") || "makeudocs-pdf";
      XLSX.writeFile(workbook, `${base}-converted.xlsx`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Excel export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setProgress(0);
    setError("");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(219,234,254,.72),transparent_34rem),linear-gradient(180deg,#f8fbff_0%,#f8fafc_45%,#fff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> Browser-based PDF table extraction
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">PDF to Excel</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
            Extract selectable PDF text and table-like columns into a real Excel workbook. Your PDF is processed in your browser.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-4xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,.10)] sm:p-8">
          {!file ? (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-6 py-14 text-center transition hover:border-blue-400 hover:bg-blue-50"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200">↗</div>
              <h2 className="mt-5 text-xl font-semibold text-zinc-900">Upload a PDF with tables</h2>
              <p className="mt-2 text-sm text-zinc-500">Drag and drop your PDF here, or choose a file from your device.</p>
              <label className="mt-6 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                Choose PDF
                <input type="file" accept="application/pdf,.pdf" onChange={handleInput} className="hidden" />
              </label>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{file.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={reset} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">Choose another</button>
              </div>

              {isExtracting && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between text-sm font-medium text-blue-900"><span>Extracting PDF tables…</span><span>{progress}%</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              )}

              {!preview.length && !isExtracting && (
                <button onClick={extract} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">Extract tables & preview</button>
              )}

              {preview.length > 0 && (
                <div className="mt-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-sm font-semibold text-zinc-900">Extraction preview</p><p className="mt-1 text-xs text-zinc-500">{preview.length} page{preview.length === 1 ? "" : "s"} · {totalRows} rows</p></div>
                    <button onClick={exportExcel} disabled={isExporting} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{isExporting ? "Preparing Excel…" : "Download Excel"}</button>
                  </div>

                  <div className="mt-5 space-y-5">
                    {preview.map((page) => (
                      <div key={page.page} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Page {page.page}</div>
                        <div className="max-h-[420px] overflow-auto">
                          <table className="min-w-full border-collapse text-left text-sm">
                            <tbody>
                              {page.rows.slice(0, 100).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-zinc-100 last:border-0">
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="whitespace-nowrap border-r border-zinc-100 px-3 py-2.5 align-top text-zinc-700 last:border-0">{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {page.rows.length > 100 && <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-400">Preview shows the first 100 rows. The Excel export contains all extracted rows.</p>}
                      </div>
                    ))}
                  </div>

                  <button onClick={extract} className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700">Re-extract PDF</button>
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</div>}
        </section>

        <section className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            ["Real Excel file", "Export editable .xlsx cells instead of a PDF image."],
            ["Browser processing", "The PDF content is extracted locally in your browser."],
            ["Table preview", "Review extracted rows before downloading the workbook."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><p className="font-semibold text-zinc-900">{title}</p><p className="mt-2 text-sm leading-6 text-zinc-500">{text}</p></div>
          ))}
        </section>

        <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-5 text-zinc-400">
          Best results come from PDFs containing selectable text with consistent table columns. Scanned/image-only PDFs are not OCR-processed by this tool yet.
        </p>
      </div>
    </main>
  );
}
