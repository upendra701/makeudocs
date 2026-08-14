"use client";

import { ChangeEvent, useState } from "react";
import { PDFDocument } from "pdf-lib";

type CompressionMode = "balanced" | "strong" | "maximum";

const COMPRESSION_SETTINGS: Record<
  CompressionMode,
  { label: string; description: string; scale: number; quality: number }
> = {
  balanced: {
    label: "Balanced",
    description: "Good quality with a useful size reduction.",
    scale: 1.35,
    quality: 0.78,
  },
  strong: {
    label: "Strong",
    description: "Smaller file with some quality reduction.",
    scale: 1.1,
    quality: 0.62,
  },
  maximum: {
    label: "Maximum",
    description: "Smallest practical file for submissions.",
    scale: 0.9,
    quality: 0.48,
  },
};

export default function CompressPdfPage() {
  const [fileName, setFileName] = useState("");
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<CompressionMode>("balanced");
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(
      index === 0 ? 0 : 2
    )} ${units[index]}`;
  };

  const reduction =
    originalSize > 0 && compressedSize > 0
      ? Math.max(
          0,
          Math.round(
            ((originalSize - compressedSize) / originalSize) * 100
          )
        )
      : 0;

  const renderPageToJpeg = async (
    pdf: any,
    pageNumber: number,
    scale: number,
    quality: number
  ) => {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error(
        `Unable to create canvas for page ${pageNumber}.`
      );
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      throw new Error(
        `Unable to create compressed image for page ${pageNumber}.`
      );
    }

    return {
      blob,
      width: viewport.width,
      height: viewport.height,
    };
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setFileName(file.name);
    setOriginalSize(file.size);
    setCompressedSize(0);
    setCompressedBlob(null);
    setPageCount(0);
    setProgress(0);
  };

  const compressPdf = async () => {
    const inputElement = document.getElementById(
      "compress-pdf-file"
    ) as HTMLInputElement | null;

    const file = inputElement?.files?.[0];

    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setIsCompressing(true);
    setError("");
    setProgress(0);
    setCompressedSize(0);
    setCompressedBlob(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");

      const pdfjsBaseUrl =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/`;

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `${pdfjsBaseUrl}build/pdf.worker.min.mjs`;

      const data = new Uint8Array(await file.arrayBuffer());

      const sourcePdf = await pdfjsLib.getDocument({
        data,
        useWasm: true,
        wasmUrl: `${pdfjsBaseUrl}wasm/`,
        useWorkerFetch: true,
        isImageDecoderSupported: false,
      }).promise;

      setPageCount(sourcePdf.numPages);

      /*
       * We progressively try the selected compression level and,
       * only when necessary, stronger levels.
       *
       * This prevents MakeUdoc from returning a "compressed" PDF
       * that is actually larger than the original.
       */
      const modes: CompressionMode[] =
        mode === "balanced"
          ? ["balanced", "strong", "maximum"]
          : mode === "strong"
            ? ["strong", "maximum"]
            : ["maximum"];

      let bestBlob: Blob | null = null;
      let bestSize = Number.POSITIVE_INFINITY;
      let successfulMode: CompressionMode | null = null;

      for (let modeIndex = 0; modeIndex < modes.length; modeIndex++) {
        const currentMode = modes[modeIndex];
        const settings = COMPRESSION_SETTINGS[currentMode];

        console.log(
          `Trying ${settings.label} compression...`
        );

        const outputPdf = await PDFDocument.create();

        for (
          let pageNumber = 1;
          pageNumber <= sourcePdf.numPages;
          pageNumber++
        ) {
          const rendered = await renderPageToJpeg(
            sourcePdf,
            pageNumber,
            settings.scale,
            settings.quality
          );

          const imageBytes = new Uint8Array(
            await rendered.blob.arrayBuffer()
          );

          const image = await outputPdf.embedJpg(imageBytes);

          const outputPage = outputPdf.addPage([
            rendered.width,
            rendered.height,
          ]);

          outputPage.drawImage(image, {
            x: 0,
            y: 0,
            width: rendered.width,
            height: rendered.height,
          });

          /*
           * Progress reflects the current compression attempt.
           * Reserve a little progress space for each attempt.
           */
          const attemptStart = modeIndex / modes.length;
          const attemptWidth = 1 / modes.length;

          setProgress(
            Math.min(
              99,
              Math.round(
                (attemptStart +
                  (pageNumber / sourcePdf.numPages) *
                    attemptWidth) *
                  100
              )
            )
          );

          console.log(
            `${settings.label}: page ${pageNumber}/${sourcePdf.numPages}`
          );

          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
        }

        const outputBytes = await outputPdf.save({
          useObjectStreams: true,
        });

        const outputArrayBuffer = new ArrayBuffer(
          outputBytes.byteLength
        );

        new Uint8Array(outputArrayBuffer).set(outputBytes);

        const outputBlob = new Blob([outputArrayBuffer], {
          type: "application/pdf",
        });

        console.log(
          `${settings.label} result:`,
          formatBytes(outputBlob.size)
        );

        /*
         * Keep the smallest generated PDF.
         */
        if (outputBlob.size < bestSize) {
          bestBlob = outputBlob;
          bestSize = outputBlob.size;
          successfulMode = currentMode;
        }

        /*
         * As soon as we have a smaller PDF, stop escalating.
         * This keeps the common case fast and avoids unnecessary
         * repeated rendering.
         */
        if (outputBlob.size < file.size) {
          console.log(
            `Using ${settings.label}: output is smaller than original.`
          );
          break;
        }

        /*
         * If this is the strongest available setting and it still
         * isn't smaller, we'll report that the original is already
         * smaller rather than giving the user a larger PDF.
         */
      }

      if (!bestBlob || bestSize >= file.size) {
        setCompressedBlob(null);
        setCompressedSize(0);
        setProgress(100);

        setError(
          "This PDF is already highly optimized. MakeUdoc could not reduce its size without producing a larger file."
        );

        console.log(
          "No smaller PDF was produced. Original:",
          formatBytes(file.size),
          "Best generated:",
          bestBlob ? formatBytes(bestSize) : "none"
        );

        return;
      }

      setCompressedBlob(bestBlob);
      setCompressedSize(bestSize);
      setProgress(100);

      console.log(
        "Compression complete:",
        formatBytes(file.size),
        "→",
        formatBytes(bestSize),
        successfulMode
          ? `using ${COMPRESSION_SETTINGS[successfulMode].label}`
          : ""
      );
    } catch (err) {
      console.error("PDF compression failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to compress this PDF."
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadCompressedPdf = () => {
    if (!compressedBlob) return;

    const url = URL.createObjectURL(compressedBlob);
    const link = document.createElement("a");

    const baseName =
      fileName
        .replace(/\.pdf$/i, "")
        .replace(/[<>:"/\\|?*]+/g, "_")
        .trim() || "compressed";

    link.href = url;
    link.download = `${baseName}-compressed.pdf`;

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
            Compress PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            Reduce PDF file size directly in your browser.
            Your file stays on your device.
          </p>
        </div>

        {/* Upload */}
        <section className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <label
            htmlFor="compress-pdf-file"
            className="mx-auto flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="text-4xl">🗜️</div>

            <h2 className="mt-4 text-lg font-semibold text-zinc-900">
              Select a PDF
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Choose a PDF to compress.
            </p>

            <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
              Choose PDF
            </span>

            <input
              id="compress-pdf-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fileName && (
            <div className="mx-auto mt-6 max-w-xl rounded-xl bg-zinc-50 p-4 text-center">
              <p className="text-sm font-medium text-zinc-900">
                {fileName}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Original size: {formatBytes(originalSize)}
              </p>
            </div>
          )}
        </section>

        {/* Compression options */}
        {fileName && (
          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900">
              Choose compression
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(
                Object.entries(COMPRESSION_SETTINGS) as [
                  CompressionMode,
                  (typeof COMPRESSION_SETTINGS)[CompressionMode]
                ][]
              ).map(([key, setting]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  disabled={isCompressing}
                  className={`rounded-2xl border p-5 text-left transition ${
                    mode === key
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                      : "border-zinc-200 bg-white hover:border-blue-300 hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900">
                      {setting.label}
                    </span>

                    <span
                      className={`h-4 w-4 rounded-full border-2 ${
                        mode === key
                          ? "border-blue-600 bg-blue-600"
                          : "border-zinc-300"
                      }`}
                    />
                  </div>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {setting.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={compressPdf}
              disabled={isCompressing}
              className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isCompressing
                ? `Compressing... ${progress}%`
                : "Compress PDF"}
            </button>

            {isCompressing && (
              <div className="mt-5">
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span>
                    Processing {pageCount > 0 ? `${pageCount} pages` : "PDF"}
                  </span>

                  <span>{progress}%</span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Result */}
        {compressedBlob && (
          <section className="mt-8 rounded-3xl border border-green-200 bg-white p-8 shadow-sm">
            <div className="text-center">
              <div className="text-4xl">✅</div>

              <h2 className="mt-4 text-2xl font-bold text-zinc-900">
                PDF compressed successfully
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-500">
                MakeUdoc only offers the result when it is actually smaller
                than the original PDF.
              </p>

              <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Original
                  </p>
                  <p className="mt-2 text-xl font-bold text-zinc-900">
                    {formatBytes(originalSize)}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Compressed
                  </p>
                  <p className="mt-2 text-xl font-bold text-zinc-900">
                    {formatBytes(compressedSize)}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                    Reduction
                  </p>
                  <p className="mt-2 text-xl font-bold text-zinc-900">
                    {reduction}%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={downloadCompressedPdf}
                className="mt-7 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Download Compressed PDF
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
            Your PDF stays in your browser
          </h3>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            MakeUdoc processes the PDF locally. No upload to a
            MakeUdoc server is required for this workflow.
          </p>
        </section>
      </div>
    </main>
  );
}