"use client";

import {
  ChangeEvent,
  useEffect,
  useState,
} from "react";

import CropEditor from "./CropEditor";
import PdfPreview from "./PdfPreview";
import {
  createPdf,
  downloadPdf,
  PDF_QUALITY_SETTINGS,
  type PdfQuality,
} from "./pdfGenerator";

type EditSnapshot = {
  preview: string;
  rotation: number;
};

type ImageFile = {
  id: string;
  file: File;

  // Permanent original image.
  originalPreview: string;

  // Current edited image.
  preview: string;

  rotation: number;

  // Undo / redo history.
  history: EditSnapshot[];
  historyIndex: number;
};

export default function ImageToPdfPage() {
  const [images, setImages] =
    useState<ImageFile[]>([]);

  const [
    editingImageId,
    setEditingImageId,
  ] = useState<string | null>(null);

  const [isMobile, setIsMobile] =
    useState(false);

  const [
    isGeneratingPdf,
    setIsGeneratingPdf,
  ] = useState(false);

  /*
   * Generated PDF URL.
   *
   * When this exists, the PDF Preview
   * screen is displayed.
   */
  const [pdfUrl, setPdfUrl] =
    useState<string | null>(null);

  const [pdfFileName, setPdfFileName] =
    useState("MakeUdoc-Assignment");
    const [pdfQuality, setPdfQuality] =
  useState<PdfQuality>("high");

  /*
   * Detect mobile screen.
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768
      );
    };

    checkMobile();

    window.addEventListener(
      "resize",
      checkMobile
    );

    return () => {
      window.removeEventListener(
        "resize",
        checkMobile
      );
    };
  }, []);

  /*
   * Clean generated PDF URL when
   * component is unmounted.
   */
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  /*
   * Upload images.
   */
  const handleImageSelect = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files ?? []
    );

    const newImages = files
      .filter((file) =>
        file.type.startsWith("image/")
      )
      .map((file) => {
        const originalPreview =
          URL.createObjectURL(file);

        const initialSnapshot: EditSnapshot =
          {
            preview:
              originalPreview,
            rotation: 0,
          };

        return {
          /*
           * Don't use crypto.randomUUID()
           * because mobile HTTP testing may
           * not provide it.
           */
          id: `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,

          file,

          originalPreview,

          preview:
            originalPreview,

          rotation: 0,

          history: [
            initialSnapshot,
          ],

          historyIndex: 0,
        };
      });

    setImages((current) => [
      ...current,
      ...newImages,
    ]);

    /*
     * MOBILE ONLY:
     *
     * Automatically open the first
     * newly selected image.
     */
    if (
      isMobile &&
      newImages.length > 0
    ) {
      setEditingImageId(
        newImages[0].id
      );
    }

    event.target.value = "";
  };

  /*
   * Add an edit to history.
   */
  const updateHistory = (
    imageId: string,
    newPreview: string,
    newRotation: number
  ) => {
    setImages((current) =>
      current.map((image) => {
        if (image.id !== imageId) {
          return image;
        }

        const newSnapshot: EditSnapshot =
          {
            preview:
              newPreview,
            rotation:
              newRotation,
          };

        /*
         * Remove future history if the
         * user makes a new change after Undo.
         */
        const newHistory = [
          ...image.history.slice(
            0,
            image.historyIndex + 1
          ),
          newSnapshot,
        ];

        return {
          ...image,

          preview:
            newPreview,

          rotation:
            newRotation,

          history:
            newHistory,

          historyIndex:
            newHistory.length - 1,
        };
      })
    );
  };

  /*
   * Rotate 90 degrees.
   */
  const rotateImage = (
    id: string
  ) => {
    const image = images.find(
      (item) =>
        item.id === id
    );

    if (!image) {
      return;
    }

    const nextRotation =
      (image.rotation + 90) %
      360;

    updateHistory(
      id,
      image.preview,
      nextRotation
    );
  };

  /*
   * Remove image.
   */
  const removeImage = (
    id: string
  ) => {
    setImages((current) => {
      const imageToRemove =
        current.find(
          (image) =>
            image.id === id
        );

      if (imageToRemove) {
        URL.revokeObjectURL(
          imageToRemove.originalPreview
        );
      }

      return current.filter(
        (image) =>
          image.id !== id
      );
    });

    if (editingImageId === id) {
      setEditingImageId(null);
    }
  };

  /*
   * Reorder pages.
   */
  const moveImage = (
    index: number,
    direction:
      | "left"
      | "right"
  ) => {
    setImages((current) => {
      const newImages = [
        ...current,
      ];

      const newIndex =
        direction === "left"
          ? index - 1
          : index + 1;

      if (
        newIndex < 0 ||
        newIndex >=
          newImages.length
      ) {
        return current;
      }

      [
        newImages[index],
        newImages[newIndex],
      ] = [
        newImages[newIndex],
        newImages[index],
      ];

      return newImages;
    });
  };

  /*
   * Undo.
   */
  const undoImage = (
    id: string
  ) => {
    setImages((current) =>
      current.map((image) => {
        if (image.id !== id) {
          return image;
        }

        if (
          image.historyIndex === 0
        ) {
          return image;
        }

        const newIndex =
          image.historyIndex - 1;

        const snapshot =
          image.history[
            newIndex
          ];

        return {
          ...image,

          preview:
            snapshot.preview,

          rotation:
            snapshot.rotation,

          historyIndex:
            newIndex,
        };
      })
    );
  };

  /*
   * Redo.
   */
  const redoImage = (
    id: string
  ) => {
    setImages((current) =>
      current.map((image) => {
        if (image.id !== id) {
          return image;
        }

        if (
          image.historyIndex >=
          image.history.length - 1
        ) {
          return image;
        }

        const newIndex =
          image.historyIndex + 1;

        const snapshot =
          image.history[
            newIndex
          ];

        return {
          ...image,

          preview:
            snapshot.preview,

          rotation:
            snapshot.rotation,

          historyIndex:
            newIndex,
        };
      })
    );
  };

  /*
   * Reset to original.
   */
  const resetImage = (
    id: string
  ) => {
    setImages((current) =>
      current.map((image) => {
        if (image.id !== id) {
          return image;
        }

        const resetSnapshot:
          EditSnapshot = {
          preview:
            image.originalPreview,
          rotation: 0,
        };

        const newHistory = [
          ...image.history,
          resetSnapshot,
        ];

        return {
          ...image,

          preview:
            image.originalPreview,

          rotation: 0,

          history:
            newHistory,

          historyIndex:
            newHistory.length - 1,
        };
      })
    );
  };

  /*
   * Apply crop.
   */
  const applyCrop = (
    imageId: string,
    croppedImage: string
  ) => {
    const image = images.find(
      (item) =>
        item.id === imageId
    );

    if (!image) {
      return;
    }

    updateHistory(
      imageId,
      croppedImage,
      0
    );

    setEditingImageId(null);
  };
const sanitizeFileName = (
  value: string
) => {
  return value
    .replace(
      /[<>:"/\\|?*]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .replace(
      /^\.+|\.+$/g,
      ""
    )
    .slice(0, 100);
};
  /*
   * CREATE PDF
   */
  const handleCreatePdf =
    async () => {
      const cleanName =
        sanitizeFileName(
          pdfFileName
        ) || "MakeUdoc-Assignment";

      setPdfFileName(cleanName);
      if (
        images.length === 0
      ) {
        return;
      }

      try {
        setIsGeneratingPdf(
          true
        );

        /*
         * Close any editor first.
         */
        setEditingImageId(null);

        /*
         * Convert current images into
         * PDF input.
         */
        const pdfImages =
          images.map(
            (image) => ({
              preview:
                image.preview,

              rotation:
                image.rotation,
            })
          );

        /*
         * Generate the PDF.
         */
        const pdfBytes =
  await createPdf(
    pdfImages,
    pdfQuality
  );

        /*
         * Convert PDF bytes into a
         * browser Blob URL.
         */
        const pdfBlob =
          new Blob(
            [pdfBytes as BlobPart],
            {
              type: "application/pdf",
            }
          );

        const newPdfUrl =
          URL.createObjectURL(
            pdfBlob
          );

        /*
         * Revoke previous PDF URL.
         */
        if (pdfUrl) {
          URL.revokeObjectURL(
            pdfUrl
          );
        }

        setPdfUrl(
          newPdfUrl
        );
      } catch (error) {
        console.error(
          "PDF generation failed:",
          error
        );

        alert(
          "Unable to create PDF. Please try again."
        );
      } finally {
        setIsGeneratingPdf(
          false
        );
      }
    };

  /*
   * Download PDF from editor.
   *
   * Preview itself also has its own
   * download button.
   */
  const handleDownloadPdf =
    async () => {
      if (!pdfUrl) {
        return;
      }

      try {
        const response =
          await fetch(pdfUrl);

        const buffer =
          await response.arrayBuffer();

        await downloadPdf(
          new Uint8Array(buffer),
          pdfFileName
        );
      } catch (error) {
        console.error(
          "PDF download failed:",
          error
        );

        alert(
          "Unable to download PDF."
        );
      }
    };

  /*
   * Return from PDF Preview to editor.
   */
  const handleBackToEditor =
    () => {
      if (pdfUrl) {
        URL.revokeObjectURL(
          pdfUrl
        );
      }

      setPdfUrl(null);
    };

  /*
   * Current image being edited.
   */
  const editingImage =
    images.find(
      (image) =>
        image.id ===
        editingImageId
    );

  /*
   * If PDF exists, show PDF Preview.
   */
  if (pdfUrl) {
    return (
      <PdfPreview
        pdfUrl={pdfUrl}
        fileName={`${pdfFileName}.pdf`}
        pagePreviews={images.map(
          (image) =>
            image.preview
        )}
        onBack={
          handleBackToEditor
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            MakeUdoc
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Image to PDF
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg">
            Turn your assignment photos
            into a clean,
            submission-ready PDF.
          </p>
        </div>

        {/* UPLOAD */}
        <div className="mt-8 rounded-3xl border-2 border-dashed border-zinc-300 bg-white p-6 text-center sm:mt-12 sm:p-14">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl sm:h-16 sm:w-16">
            📸
          </div>

          <h2 className="mt-5 text-lg font-semibold text-zinc-900 sm:mt-6 sm:text-xl">
            Upload your images
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            Select JPG or PNG images
            from your device.
          </p>

          <label className="mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white transition hover:bg-blue-700 sm:mt-7 sm:w-auto sm:px-7">
            📸 Select Images

            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={
                handleImageSelect
              }
              className="hidden"
            />
          </label>

          <p className="mt-4 text-xs text-zinc-400">
            Your files are processed
            in your browser.
          </p>
        </div>

        {/* SELECTED PAGES */}
        {images.length > 0 && (
          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-4 sm:mt-10 sm:p-8">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  Selected pages
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {images.length}{" "}
                  {images.length ===
                  1
                    ? "image"
                    : "images"}{" "}
                  selected
                </p>
              </div>

              <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-zinc-50 sm:w-auto">
                + Add more

                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  onChange={
                    handleImageSelect
                  }
                  className="hidden"
                />
              </label>
            </div>

            {/* IMAGE GRID */}
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {images.map(
                (image, index) => {
                  const canUndo =
                    image.historyIndex >
                    0;

                  const canRedo =
                    image.historyIndex <
                    image.history.length -
                      1;

                  return (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
                    >

                      {/* PREVIEW */}
                      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-zinc-100">

                        <img
                          src={
                            image.preview
                          }
                          alt={`Page ${
                            index + 1
                          }`}
                          className="max-h-full max-w-full object-contain transition-transform duration-300"
                          style={{
                            transform:
                              `rotate(${image.rotation}deg)`,
                          }}
                        />

                        <div className="absolute left-3 top-3 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                          Page{" "}
                          {index + 1}
                        </div>
                      </div>

                      {/* FILE NAME */}
                      <div className="border-t border-zinc-200 px-3 pt-3">
                        <p className="truncate text-xs text-zinc-500">
                          {
                            image.file
                              .name
                          }
                        </p>
                      </div>

                      {/* CONTROLS */}
                      <div className="p-3">

                        {/* UNDO REDO RESET */}
                        <div className="mb-3 grid grid-cols-3 gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              undoImage(
                                image.id
                              )
                            }
                            disabled={
                              !canUndo
                            }
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↶ Undo
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              redoImage(
                                image.id
                              )
                            }
                            disabled={
                              !canRedo
                            }
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↷ Redo
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              resetImage(
                                image.id
                              )
                            }
                            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
                          >
                            ↩ Reset
                          </button>

                        </div>

                        {/* MAIN CONTROLS */}
                        <div className="grid grid-cols-5 gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              moveImage(
                                index,
                                "left"
                              )
                            }
                            disabled={
                              index ===
                              0
                            }
                            className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white py-2.5 text-lg font-bold text-zinc-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Move left"
                          >
                            ←
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveImage(
                                index,
                                "right"
                              )
                            }
                            disabled={
                              index ===
                              images.length -
                                1
                            }
                            className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white py-2.5 text-lg font-bold text-zinc-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Move right"
                          >
                            →
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingImageId(
                                image.id
                              )
                            }
                            className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white py-2.5 text-lg font-bold text-zinc-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                            title="Crop image"
                          >
                            ✂️
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              rotateImage(
                                image.id
                              )
                            }
                            className="flex items-center justify-center rounded-lg border border-zinc-300 bg-white py-2.5 text-lg font-bold text-zinc-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                            title="Rotate 90 degrees"
                          >
                            ↻
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                image.id
                              )
                            }
                            className="flex items-center justify-center rounded-lg border border-red-300 bg-red-50 py-2.5 text-lg font-bold text-red-600 shadow-sm transition hover:border-red-400 hover:bg-red-100"
                            title="Remove image"
                          >
                            🗑
                          </button>

                        </div>
                      </div>
                    </div>
                  );
                }
              )}

            </div>
          </section>
        )}

        {/* CREATE PDF */}
        {images.length > 0 && (
          <div className="mt-8">

            <div className="mx-auto max-w-md">

              <label
                htmlFor="pdf-file-name"
                className="mb-2 block text-left text-sm font-semibold text-zinc-700"
              >
                PDF file name
              </label>

              <div className="flex items-center overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">

                <input
                  id="pdf-file-name"
                  type="text"
                  value={pdfFileName}
                  onChange={(event) =>
                    setPdfFileName(
                      event.target.value
                    )
                  }
                  placeholder="MakeUdoc-Assignment"
                  maxLength={100}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />

                <span className="border-l border-zinc-200 px-3 text-sm font-medium text-zinc-400">
                  .pdf
                </span>

              </div>

              <p className="mt-2 text-left text-xs text-zinc-400">
                Choose a name for your downloaded PDF.
              </p>
              <div className="mt-5">

  <p className="mb-2 text-left text-sm font-semibold text-zinc-700">
    PDF Quality
  </p>

  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

    {(
      Object.entries(
        PDF_QUALITY_SETTINGS
      ) as [
        PdfQuality,
        (typeof PDF_QUALITY_SETTINGS)[PdfQuality]
      ][]
    ).map(
      ([quality, settings]) => {
        const selected =
          pdfQuality === quality;

        return (
          <button
            key={quality}
            type="button"
            onClick={() =>
              setPdfQuality(
                quality
              )
            }
            className={`w-full rounded-xl border-2 p-3 text-left transition active:scale-[0.98] ${
              selected
                ? "border-blue-600 bg-blue-50 shadow-sm"
                : "border-zinc-200 bg-white hover:border-zinc-400"
            }`}
          >

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-[10px] text-white"
                      : "border-zinc-300 bg-white"
                  }`}
                >
                  {selected
                    ? "✓"
                    : ""}
                </span>

                <span className="text-sm font-semibold text-zinc-800">
                  {settings.label}
                </span>

              </div>

              {quality ===
                "high" && (
                <span className="rounded-full bg-blue-600 px-2 py-1 text-[9px] font-bold text-white">
                  Recommended
                </span>
              )}

            </div>

            <p className="mt-1 pl-7 text-xs text-zinc-500">
              {settings.description}
            </p>

          </button>
        );
      }
    )}

  </div>

</div>

            </div>

            <div className="text-center">

              <button
                type="button"
                onClick={
                  handleCreatePdf
                }
                disabled={
                  isGeneratingPdf
                }
                className="mt-5 w-full rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isGeneratingPdf
                  ? "Creating PDF..."
                  : "📄 Create PDF"}
              </button>

              <p className="mt-3 text-xs text-zinc-400">
                Your PDF is created
                directly in your browser.
              </p>

            </div>
          </div>
        )}

        {/* CROP EDITOR */}
        {editingImage && (
          <CropEditor
            image={
              editingImage.preview
            }
            originalImage={
              editingImage.originalPreview
            }
            onCancel={() =>
              setEditingImageId(
                null
              )
            }
            onApply={(
              croppedImage
            ) =>
              applyCrop(
                editingImage.id,
                croppedImage
              )
            }
          />
        )}

      </div>
    </main>
  );
}