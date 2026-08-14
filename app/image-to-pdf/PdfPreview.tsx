"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  A4_WIDTH,
  A4_HEIGHT,
  PDF_MARGIN,
  calculatePdfLayout,
} from "./pdfGenerator";

type PdfPreviewProps = {
  pdfUrl: string;
  fileName: string;
  pagePreviews: string[];
  onBack: () => void;
};

export default function PdfPreview({
  pdfUrl,
  fileName,
  pagePreviews,
  onBack,
}: PdfPreviewProps) {
  const [selectedPage, setSelectedPage] =
    useState(0);

  const [isDownloading, setIsDownloading] =
    useState(false);

  /*
   * Reset to first page whenever a new
   * PDF is generated.
   */
  useEffect(() => {
    setSelectedPage(0);
  }, [pdfUrl]);

  /*
   * Keep selected page valid.
   */
  useEffect(() => {
    if (
      selectedPage >=
      pagePreviews.length
    ) {
      setSelectedPage(
        Math.max(
          0,
          pagePreviews.length - 1
        )
      );
    }
  }, [
    selectedPage,
    pagePreviews.length,
  ]);

  /*
   * Current image.
   */
  const currentPreview =
    useMemo(() => {
      return (
        pagePreviews[
          selectedPage
        ] ?? null
      );
    }, [
      pagePreviews,
      selectedPage,
    ]);

  /*
   * Calculate the same content area
   * used by pdfGenerator.ts.
   *
   * This keeps preview and PDF aligned.
   */
  const previewLayout =
    useMemo(() => {
      if (!currentPreview) {
        return null;
      }

      /*
       * We need the actual image
       * dimensions.
       */
      return null;
    }, [currentPreview]);

  /*
   * Download actual generated PDF.
   */
  const handleDownload =
    async () => {
      if (!pdfUrl) {
        return;
      }

      try {
        setIsDownloading(
          true
        );

        const response =
          await fetch(
            pdfUrl
          );

        if (!response.ok) {
          throw new Error(
            "Unable to access PDF."
          );
        }

        const blob =
          await response.blob();

        const downloadUrl =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          downloadUrl;

        link.download =
          fileName;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        setTimeout(() => {
          URL.revokeObjectURL(
            downloadUrl
          );
        }, 1000);
      } catch (error) {
        console.error(
          "PDF download failed:",
          error
        );

        /*
         * Fallback for browsers that
         * don't allow blob downloads.
         */
        window.open(
          pdfUrl,
          "_blank",
          "noopener,noreferrer"
        );
      } finally {
        setIsDownloading(
          false
        );
      }
    };

  const handlePreviousPage =
    () => {
      setSelectedPage(
        (current) =>
          Math.max(
            0,
            current - 1
          )
      );
    };

  const handleNextPage =
    () => {
      setSelectedPage(
        (current) =>
          Math.min(
            pagePreviews.length -
              1,
            current + 1
          )
      );
    };

  const isFirstPage =
    selectedPage === 0;

  const isLastPage =
    selectedPage ===
    pagePreviews.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-100">

      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3 py-3 shadow-sm sm:px-6 sm:py-4">

        <div className="flex min-w-0 items-center gap-3">

          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white text-xl font-bold text-zinc-700 transition hover:bg-zinc-50"
            title="Back to editor"
          >
            ←
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-zinc-900 sm:text-lg">
              PDF Preview
            </h1>

            <p className="truncate text-xs text-zinc-500 sm:text-sm">
              {fileName}
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={
            handleDownload
          }
          disabled={
            isDownloading
          }
          className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
        >
          {isDownloading
            ? "Preparing..."
            : "⬇ Download PDF"}
        </button>

      </header>

      {/* MAIN */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">

        {/* THUMBNAILS */}
        <aside className="order-2 shrink-0 border-t border-zinc-200 bg-white md:order-1 md:w-32 md:border-r md:border-t-0">

          <div className="flex h-full gap-3 overflow-x-auto p-3 md:flex-col md:overflow-x-hidden md:overflow-y-auto">

            {pagePreviews.map(
              (
                preview,
                index
              ) => {
                const isSelected =
                  selectedPage ===
                  index;

                return (
                  <button
                    key={`${preview}-${index}`}
                    type="button"
                    onClick={() =>
                      setSelectedPage(
                        index
                      )
                    }
                    className={`relative shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-100 p-1 transition ${
                      isSelected
                        ? "border-blue-600 shadow-md"
                        : "border-zinc-200 hover:border-zinc-400"
                    }`}
                  >

                    <div className="flex h-24 w-20 items-center justify-center md:h-28 md:w-24">

                      <img
                        src={preview}
                        alt={`Page ${
                          index + 1
                        }`}
                        className="max-h-full max-w-full object-contain"
                      />

                    </div>

                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-900/70 text-white"
                      }`}
                    >
                      {index + 1}
                    </span>

                  </button>
                );
              }
            )}

          </div>
        </aside>

        {/* PREVIEW */}
        <main className="order-1 min-h-0 flex-1 md:order-2">

          <div className="flex h-full flex-col">

            {/* PAGE INFO */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5 sm:px-6">

              <p className="text-sm font-semibold text-zinc-700">
                Page{" "}
                {selectedPage + 1}{" "}
                of{" "}
                {pagePreviews.length}
              </p>

              <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                A4
              </div>

            </div>

            {/* A4 PREVIEW */}
            <div className="min-h-0 flex-1 overflow-auto bg-zinc-200 p-3 sm:p-6">

              <div className="flex min-h-full w-full items-center justify-center">

                {currentPreview ? (
                  <div
                    className="relative w-full max-w-[650px] overflow-hidden bg-white shadow-2xl"
                    style={{
                      aspectRatio:
                        `${A4_WIDTH}/${A4_HEIGHT}`,
                    }}
                  >

                    {/* A4 PAGE */}

                    <div className="absolute inset-0 bg-white">

                      {/* CONTENT AREA */}

                      <div
                        className="absolute overflow-hidden"
                        style={{
                          left:
                            `${(PDF_MARGIN / A4_WIDTH) * 100}%`,

                          top:
                            `${(PDF_MARGIN / A4_HEIGHT) * 100}%`,

                          width:
                            `${((A4_WIDTH - PDF_MARGIN * 2) / A4_WIDTH) * 100}%`,

                          height:
                            `${((A4_HEIGHT - PDF_MARGIN * 2) / A4_HEIGHT) * 100}%`,
                        }}
                      >

                        <img
                          src={
                            currentPreview
                          }
                          alt={`PDF Page ${
                            selectedPage +
                            1
                          }`}
                          className="h-full w-full object-contain"
                        />

                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
                    <p className="font-medium text-zinc-700">
                      No preview available.
                    </p>
                  </div>
                )}

              </div>

            </div>

          </div>

        </main>

      </div>

      {/* MOBILE NAVIGATION */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-white px-3 py-3 md:hidden">

        <button
          type="button"
          onClick={
            handlePreviousPage
          }
          disabled={
            isFirstPage
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-xl font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ←
        </button>

        <div className="text-center">

          <p className="text-sm font-bold text-zinc-800">
            Page{" "}
            {selectedPage + 1}
          </p>

          <p className="text-[11px] text-zinc-400">
            of{" "}
            {pagePreviews.length}
          </p>

        </div>

        <button
          type="button"
          onClick={
            handleNextPage
          }
          disabled={
            isLastPage
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-300 bg-white text-xl font-bold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          →
        </button>

      </div>

    </div>
  );
}