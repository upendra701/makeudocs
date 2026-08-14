"use client";

import { ChangeEvent, useState } from "react";
import { PDFDocument } from "pdf-lib";

type PdfItem = {
  id: string;
  file: File;
};

export default function MergePdfPage() {
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState("");
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedPageCount, setMergedPageCount] = useState(0);
  const [outputFileName, setOutputFileName] = useState("merged-document");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(bytes / Math.pow(1024, index)).toFixed(
      index === 0 ? 0 : 2
    )} ${units[index]}`;
  };

  const totalSize = pdfs.reduce(
    (total, item) => total + item.file.size,
    0
  );

  const addPdfs = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) return;

    setError("");
    setMergedBlob(null);
    setMergedPageCount(0);

    const validFiles = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (validFiles.length !== files.length) {
      setError("Only PDF files can be added.");
    }

    const newItems: PdfItem[] = validFiles.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
      file,
    }));

    setPdfs((current) => [...current, ...newItems]);

    // Allow the same file to be selected again later.
    event.target.value = "";
  };

  const removePdf = (id: string) => {
    setPdfs((current) => current.filter((item) => item.id !== id));
    setMergedBlob(null);
    setMergedPageCount(0);
    setError("");
  };

  const movePdf = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= pdfs.length) return;

    setPdfs((current) => {
      const updated = [...current];
      [updated[index], updated[newIndex]] = [
        updated[newIndex],
        updated[index],
      ];
      return updated;
    });

    setMergedBlob(null);
    setMergedPageCount(0);
  };

  const clearAll = () => {
    setPdfs([]);
    setMergedBlob(null);
    setMergedPageCount(0);
    setError("");
  };

  const mergePdfs = async () => {
    if (pdfs.length < 2) {
      setError("Please add at least two PDF files to merge.");
      return;
    }

    setIsMerging(true);
    setError("");
    setMergedBlob(null);
    setMergedPageCount(0);

    try {
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      for (let index = 0; index < pdfs.length; index++) {
        const item = pdfs[index];

        const fileBytes = new Uint8Array(
          await item.file.arrayBuffer()
        );

        const sourcePdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices()
        );

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        totalPages += sourcePdf.getPageCount();

        console.log(
          `Merged ${index + 1}/${pdfs.length}: ${item.file.name}`
        );

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }

      const mergedBytes = await mergedPdf.save({
        useObjectStreams: true,
      });

      const outputArrayBuffer = new ArrayBuffer(
        mergedBytes.byteLength
      );

      new Uint8Array(outputArrayBuffer).set(mergedBytes);

      const blob = new Blob([outputArrayBuffer], {
        type: "application/pdf",
      });

      setMergedBlob(blob);
      setMergedPageCount(totalPages);

      console.log(
        `Merge complete: ${pdfs.length} files, ${totalPages} pages`
      );
    } catch (err) {
      console.error("PDF merge failed:", err);

      setError(
        err instanceof Error
          ? `Unable to merge PDFs: ${err.message}`
          : "Unable to merge the selected PDFs."
      );
    } finally {
      setIsMerging(false);
    }
  };

  const downloadMergedPdf = () => {
    if (!mergedBlob) return;

    const url = URL.createObjectURL(mergedBlob);
    const link = document.createElement("a");

    const safeName =
      outputFileName
        .replace(/\.pdf$/i, "")
        .replace(/[<>:"/\\|?*]+/g, "_")
        .trim() || "merged-document";

    link.href = url;
    link.download = `${safeName}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            MakeUdoc
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            Merge PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            Combine multiple PDF files into one document directly
            in your browser.
          </p>
        </div>

        {/* Upload */}
        <section className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <label
            htmlFor="merge-pdf-files"
            className="mx-auto flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="text-4xl">📑</div>

            <h2 className="mt-4 text-lg font-semibold text-zinc-900">
              Select PDF files
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Select two or more PDFs. You can change their order
              before merging.
            </p>

            <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
              Add PDFs
            </span>

            <input
              id="merge-pdf-files"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={addPdfs}
              className="hidden"
            />
          </label>

          {pdfs.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    PDFs to merge
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {pdfs.length} file{pdfs.length === 1 ? "" : "s"} •{" "}
                    {formatBytes(totalSize)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearAll}
                  disabled={isMerging}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {pdfs.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                        📄
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-900">
                          {item.file.name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          File {index + 1} •{" "}
                          {formatBytes(item.file.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => movePdf(index, -1)}
                        disabled={index === 0 || isMerging}
                        aria-label={`Move ${item.file.name} up`}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => movePdf(index, 1)}
                        disabled={
                          index === pdfs.length - 1 || isMerging
                        }
                        aria-label={`Move ${item.file.name} down`}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => removePdf(item.id)}
                        disabled={isMerging}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={mergePdfs}
                disabled={pdfs.length < 2 || isMerging}
                className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isMerging
                  ? "Merging PDFs..."
                  : `Merge ${pdfs.length} PDFs`}
              </button>
            </div>
          )}
        </section>

        {/* Result */}
        {mergedBlob && (
          <section className="mt-8 rounded-3xl border border-green-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="text-4xl">✅</div>

              <h2 className="mt-4 text-2xl font-bold text-zinc-900">
                PDFs merged successfully
              </h2>

              <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Files
                  </p>

                  <p className="mt-2 text-xl font-bold text-zinc-900">
                    {pdfs.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Pages
                  </p>

                  <p className="mt-2 text-xl font-bold text-zinc-900">
                    {mergedPageCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                    Output size
                  </p>

                  <p className="mt-2 text-xl font-bold text-zinc-900">
                    {formatBytes(mergedBlob.size)}
                  </p>
                </div>
              </div>

              <div className="mx-auto mt-7 max-w-md text-left">
                <label
                  htmlFor="merged-file-name"
                  className="block text-sm font-semibold text-zinc-700"
                >
                  File name
                </label>

                <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    id="merged-file-name"
                    type="text"
                    value={outputFileName}
                    onChange={(event) =>
                      setOutputFileName(event.target.value)
                    }
                    placeholder="merged-document"
                    className="min-w-0 flex-1 px-4 py-3 text-sm text-zinc-900 outline-none"
                    disabled={isMerging}
                  />

                  <span className="pr-4 text-sm font-medium text-zinc-400">
                    .pdf
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadMergedPdf}
                className="mt-5 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Download Merged PDF
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Privacy */}
        <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-8 text-center">
          <div className="text-3xl">🔒</div>

          <h3 className="mt-4 text-xl font-bold text-zinc-900">
            Your PDFs stay in your browser
          </h3>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            MakeUdoc merges your files locally. Your PDFs do not
            need to be uploaded to a MakeUdoc server.
          </p>
        </section>
      </div>
    </main>
  );
}