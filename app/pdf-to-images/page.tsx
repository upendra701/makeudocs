"use client";

import JSZip from "jszip";
import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

type PdfDocument = Awaited<
  ReturnType<typeof import("pdfjs-dist")["getDocument"]>
>["promise"] extends Promise<infer T>
  ? T
  : never;

export default function PdfToImagesPage() {
  const pdfRef = useRef<PdfDocument | null>(null);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);

  const setCanvasRef = (
    pageNumber: number,
    canvas: HTMLCanvasElement | null
  ) => {
    canvasRefs.current[pageNumber] = canvas;
  };

  const renderAllPages = async (
    pdf: PdfDocument,
    pdfjsLib: typeof import("pdfjs-dist")
  ) => {
    setIsRendering(true);
    setRenderedPages(0);

    /*
     * Render sequentially rather than all 42 pages at once.
     * This keeps memory and CPU usage under control for large PDFs.
     */
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      try {
        const page = await pdf.getPage(pageNumber);

        // 1.25 gives a good preview while avoiding unnecessary memory use.
        const viewport = page.getViewport({
          scale: 1.25,
        });

        const canvas = canvasRefs.current[pageNumber];

        if (!canvas) {
          throw new Error(
            `Canvas for page ${pageNumber} is not available.`
          );
        }

        const context = canvas.getContext("2d", {
          alpha: false,
        });

        if (!context) {
          throw new Error(
            `Unable to create canvas context for page ${pageNumber}.`
          );
        }

        const outputScale =
          typeof window !== "undefined"
            ? window.devicePixelRatio || 1
            : 1;

        const cssWidth = Math.floor(viewport.width);
        const cssHeight = Math.floor(viewport.height);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        context.save();
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        const transform =
          outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : undefined;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform,
        });

        await renderTask.promise;

        setRenderedPages(pageNumber);

        console.log(
          `PDF page ${pageNumber}/${pdf.numPages} rendered successfully.`
        );

        // Release the page proxy if supported by this PDF.js version.
        if (
          "cleanup" in page &&
          typeof page.cleanup === "function"
        ) {
          page.cleanup();
        }

        // Give the browser a chance to paint between pages.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      } catch (pageError) {
        console.error(
          `Failed to render PDF page ${pageNumber}:`,
          pageError
        );

        throw pageError;
      }
    }

    setIsRendering(false);
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setFileName(file.name);
    setPageCount(0);
    setRenderedPages(0);
    setIsLoading(true);
    setIsRendering(false);
    pdfRef.current = null;

    try {
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Please select a PDF file.");
      }

      // PDF.js is loaded only in the browser.
      const pdfjsLib = await import("pdfjs-dist");

      console.log("PDF.js version:", pdfjsLib.version);

      const pdfjsBaseUrl =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/`;

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `${pdfjsBaseUrl}build/pdf.worker.min.mjs`;

      const data = new Uint8Array(await file.arrayBuffer());

      const loadingTask = pdfjsLib.getDocument({
        data,
        useWasm: true,
        wasmUrl: `${pdfjsBaseUrl}wasm/`,
        useWorkerFetch: true,
        isImageDecoderSupported: false,
      });

      const pdf = await loadingTask.promise;

      pdfRef.current = pdf;
      setPageCount(pdf.numPages);

      console.log("PDF loaded:", pdf.numPages, "pages");

      /*
       * React needs one render pass to create all the canvas
       * elements before PDF.js can draw into them.
       *
       * We therefore wait for the next animation frame after
       * pageCount is set, then render the pages.
       */
      setIsLoading(false);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      await renderAllPages(pdf, pdfjsLib);
    } catch (err) {
      console.error("PDF rendering failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to render this PDF."
      );

      setIsLoading(false);
      setIsRendering(false);
    }
  };

  const progress =
    pageCount > 0
      ? Math.round((renderedPages / pageCount) * 100)
      : 0;

  const downloadPageAsPng = (pageNumber: number) => {
    const canvas = canvasRefs.current[pageNumber];

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      setError(`Page ${pageNumber} is not ready for download yet.`);
      return;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError(`Unable to create PNG for page ${pageNumber}.`);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `page-${pageNumber}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
      },
      "image/png"
    );
  };

  const canvasToPngBlob = (
    pageNumber: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRefs.current[pageNumber];

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        reject(
          new Error(`Page ${pageNumber} is not ready for download.`)
        );
        return;
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(
            new Error(`Unable to create PNG for page ${pageNumber}.`)
          );
          return;
        }

        resolve(blob);
      }, "image/png");
    });
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };


  const downloadAllPages = async () => {
    if (pageCount === 0 || renderedPages !== pageCount) {
      setError("Please wait until all PDF pages are rendered.");
      return;
    }

    try {
      setError("");

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        const blob = await canvasToPngBlob(pageNumber);
        downloadBlob(blob, `page-${pageNumber}.png`);

        // Give the browser a moment between downloads.
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 150);
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download all pages."
      );
    }
  };

  const downloadPagesAsZip = async () => {
    if (pageCount === 0 || renderedPages !== pageCount) {
      setError("Please wait until all PDF pages are rendered.");
      return;
    }

    try {
      setError("");

      const zip = new JSZip();

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
        const blob = await canvasToPngBlob(pageNumber);
        zip.file(`page-${pageNumber}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6,
        },
      });

      const baseName =
        fileName
          .replace(/\.pdf$/i, "")
          .replace(/[<>:"/\\|?*]+/g, "_")
          .trim() || "pdf";

      downloadBlob(zipBlob, `${baseName}-images.zip`);
    } catch (err) {
      console.error("ZIP creation failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the ZIP file."
      );
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            MakeUdoc
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900">
            PDF to Images
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            Convert every PDF page into a PNG image directly in your browser.
          </p>
        </div>

        {/* Upload */}
        <section className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <label
            htmlFor="pdf-file"
            className="mx-auto flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <div className="text-4xl">📄</div>

            <h2 className="mt-4 text-lg font-semibold text-zinc-900">
              Select a PDF
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Upload a PDF to render all of its pages.
            </p>

            <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
              Choose PDF
            </span>

            <input
              id="pdf-file"
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

              {pageCount > 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  {pageCount} page{pageCount === 1 ? "" : "s"} detected
                </p>
              )}
            </div>
          )}

          {isLoading && (
            <p className="mt-6 text-center text-sm font-medium text-blue-600">
              Loading PDF...
            </p>
          )}

          {isRendering && pageCount > 0 && (
            <div className="mx-auto mt-6 max-w-xl">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">
                  Rendering pages
                </span>

                <span className="font-semibold text-blue-600">
                  {renderedPages} / {pageCount}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!isRendering &&
            pageCount > 0 &&
            renderedPages === pageCount && (
              <>
                <p className="mt-6 text-center text-sm font-semibold text-green-600">
                  ✓ All {pageCount} pages rendered successfully
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={downloadAllPages}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Download All
                  </button>

                  <button
                    type="button"
                    onClick={downloadPagesAsZip}
                    className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Download as ZIP
                  </button>
                </div>
              </>
            )}

          {error && (
            <div className="mx-auto mt-6 max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        {/* Pages */}
        {pageCount > 0 && (
          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">
                PDF Pages
              </h2>

              <span className="rounded-full bg-zinc-200 px-3 py-1 text-sm font-medium text-zinc-700">
                {renderedPages}/{pageCount}
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {Array.from(
                { length: pageCount },
                (_, index) => index + 1
              ).map((pageNumber) => (
                <article
                  key={pageNumber}
                  className="overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-zinc-900">
                      Page {pageNumber}
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        {pageNumber <= renderedPages
                          ? "Rendered"
                          : "Waiting"}
                      </span>

                      <button
                        type="button"
                        onClick={() => downloadPageAsPng(pageNumber)}
                        disabled={pageNumber > renderedPages}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                      >
                        Download PNG
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[420px] items-center justify-center overflow-auto rounded-2xl bg-zinc-100 p-4">
                    <canvas
                      ref={(canvas) =>
                        setCanvasRef(pageNumber, canvas)
                      }
                      className="block max-w-full bg-white shadow-md"
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}