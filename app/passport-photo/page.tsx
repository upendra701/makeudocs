"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type CompressionOption = "best" | "500" | "200" | "100";

type PhotoSize = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  ratio: number;
};

const PHOTO_SIZES: PhotoSize[] = [
  {
    id: "india",
    label: "India Passport",
    widthMm: 35,
    heightMm: 45,
    ratio: 35 / 45,
  },
  {
    id: "square",
    label: "2 × 2 inch",
    widthMm: 51,
    heightMm: 51,
    ratio: 1,
  },
];

const PREVIEW_WIDTH = 350;
const PREVIEW_HEIGHT = 450;


function AdjustmentSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">
          {label}
        </label>

        <span className="text-xs font-semibold text-zinc-500">
          {value > 0 ? `+${value}` : value}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="mt-2 w-full accent-blue-600"
      />
    </div>
  );
}

export default function PassportPhotoPage() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointerId: null as number | null,
  });

  const [imageUrl, setImageUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("india");
  const [zoom, setZoom] = useState(1);
  const [previewWidth, setPreviewWidth] = useState(PREVIEW_WIDTH);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState("");
  const [compressionOption, setCompressionOption] = useState<CompressionOption>("best");
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);

  const selectedSize =
    PHOTO_SIZES.find((size) => size.id === selectedSizeId) ??
    PHOTO_SIZES[0];

  const previewAspectRatio = selectedSize.ratio;

  const previewHeight = previewWidth / previewAspectRatio;

  useEffect(() => {
    const updatePreviewWidth = () => {
      // Keep the desktop size, but make the crop fit comfortably inside
      // narrow mobile viewports with room for the surrounding card padding.
      const mobileWidth = window.innerWidth - 64;
      setPreviewWidth(Math.min(PREVIEW_WIDTH, Math.max(260, mobileWidth)));
    };

    updatePreviewWidth();
    window.addEventListener("resize", updatePreviewWidth);

    return () => window.removeEventListener("resize", updatePreviewWidth);
  }, []);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const resetPosition = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a JPG, JPEG, or PNG image.");
      return;
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const nextUrl = URL.createObjectURL(file);

    setImageUrl(nextUrl);
    setFileName(file.name);
    setImageLoaded(false);
    setError("");
    resetPosition();

    event.target.value = "";
  };

  const getCoverScale = () => {
    const image = imageRef.current;

    if (!image || !image.naturalWidth || !image.naturalHeight) {
      return 1;
    }

    return Math.max(
      previewWidth / image.naturalWidth,
      previewHeight / image.naturalHeight
    );
  };

  const resetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setSaturation(0);
    setSharpness(0);
  };

  const applyPixelAdjustments = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    if (
      brightness === 0 &&
      contrast === 0 &&
      saturation === 0 &&
      sharpness === 0
    ) {
      return;
    }

    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const brightnessAmount = brightness * 2.55;
    const contrastFactor =
      (259 * (contrast + 255)) /
      (255 * (259 - contrast));

    const saturationFactor = 1 + saturation / 100;

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];

      // Brightness + contrast.
      r = contrastFactor * (r - 128) + 128 + brightnessAmount;
      g = contrastFactor * (g - 128) + 128 + brightnessAmount;
      b = contrastFactor * (b - 128) + 128 + brightnessAmount;

      // Saturation.
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;

      pixels[i] = Math.max(0, Math.min(255, r));
      pixels[i + 1] = Math.max(0, Math.min(255, g));
      pixels[i + 2] = Math.max(0, Math.min(255, b));
    }

    /*
     * Unsharp-mask style sharpening.
     *
     * We compare each pixel with a small 3x3 neighborhood and push
     * the pixel away from the local average. This produces a visible
     * edge enhancement while keeping the effect controlled enough
     * for passport photos.
     */
    if (sharpness > 0) {
      const source = new Uint8ClampedArray(pixels);
      const amount = sharpness / 100;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = (y * width + x) * 4;

          for (let channel = 0; channel < 3; channel++) {
            const center = source[index + channel];

            const north =
              source[((y - 1) * width + x) * 4 + channel];
            const south =
              source[((y + 1) * width + x) * 4 + channel];
            const west =
              source[(y * width + (x - 1)) * 4 + channel];
            const east =
              source[(y * width + (x + 1)) * 4 + channel];

            const northWest =
              source[((y - 1) * width + (x - 1)) * 4 + channel];
            const northEast =
              source[((y - 1) * width + (x + 1)) * 4 + channel];
            const southWest =
              source[((y + 1) * width + (x - 1)) * 4 + channel];
            const southEast =
              source[((y + 1) * width + (x + 1)) * 4 + channel];

            const neighborhoodAverage =
              (north +
                south +
                west +
                east +
                northWest +
                northEast +
                southWest +
                southEast) /
              8;

            const detail = center - neighborhoodAverage;

            const sharpened =
              center + detail * amount * 3;

            pixels[index + channel] = Math.max(
              0,
              Math.min(255, sharpened)
            );
          }
        }
      }
    }

    context.putImageData(imageData, 0, 0);
  };

  const getDrawValues = () => {
    const image = imageRef.current;

    if (!image) return null;

    const coverScale = getCoverScale();
    const scale = coverScale * zoom;

    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    const centeredX = (previewWidth - drawWidth) / 2;
    const centeredY = (previewHeight - drawHeight) / 2;

    return {
      drawWidth,
      drawHeight,
      x: centeredX + position.x,
      y: centeredY + position.y,
    };
  };

  const redrawPreview = () => {
    const canvas = previewCanvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !imageLoaded) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = Math.round(previewWidth);
    canvas.height = Math.round(previewHeight);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const values = getDrawValues();

    if (!values) return;

    context.drawImage(
      image,
      values.x,
      values.y,
      values.drawWidth,
      values.drawHeight
    );

    applyPixelAdjustments(
      context,
      canvas.width,
      canvas.height
    );
  };

  useEffect(() => {
    redrawPreview();
  }, [
    imageLoaded,
    zoom,
    position.x,
    position.y,
    selectedSizeId,
    previewHeight,
    previewWidth,
    brightness,
    contrast,
    saturation,
    sharpness,
  ]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const startDragging = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!imageLoaded) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      pointerId: event.pointerId,
    };
  };

  const handleDragging = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      !dragRef.current.active ||
      dragRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    const nextX =
      dragRef.current.originX +
      event.clientX -
      dragRef.current.startX;

    const nextY =
      dragRef.current.originY +
      event.clientY -
      dragRef.current.startY;

    setPosition({
      x: nextX,
      y: nextY,
    });
  };

  const stopDragging = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && dragRef.current.pointerId !== event.pointerId) return;

    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current.active = false;
    dragRef.current.pointerId = null;
  };

  const renderCurrentCropToCanvas = (
    width: number,
    height: number,
    quality: number
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = imageRef.current;

      if (!image || !imageLoaded) {
        reject(new Error("Please upload a photo first."));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to create the photo canvas."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      const values = getDrawValues();

      if (!values) {
        reject(new Error("Unable to prepare the photo crop."));
        return;
      }

      const scaleX = width / previewWidth;
      const scaleY = height / previewHeight;

      context.drawImage(
        image,
        values.x * scaleX,
        values.y * scaleY,
        values.drawWidth * scaleX,
        values.drawHeight * scaleY
      );

      applyPixelAdjustments(
        context,
        canvas.width,
        canvas.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to create the JPEG photo."));
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    });
  };

  const getCompressionTarget = () => {
    if (compressionOption === "500") return 500 * 1024;
    if (compressionOption === "200") return 200 * 1024;
    if (compressionOption === "100") return 100 * 1024;

    return null;
  };

  const createCompressedPhoto = async (): Promise<Blob> => {
    /*
     * The downloadable photo is rendered at a print-friendly
     * 300 DPI equivalent for the selected physical size.
     *
     * 35 × 45 mm ≈ 413 × 531 px
     * 51 × 51 mm ≈ 602 × 602 px
     */
    const outputWidth = Math.max(
      1,
      Math.round((selectedSize.widthMm / 25.4) * 300)
    );

    const outputHeight = Math.max(
      1,
      Math.round((selectedSize.heightMm / 25.4) * 300)
    );

    const targetBytes = getCompressionTarget();

    if (!targetBytes) {
      return renderCurrentCropToCanvas(
        outputWidth,
        outputHeight,
        0.92
      );
    }

    /*
     * Binary-search JPEG quality so the requested target size
     * is actually verified rather than guessed.
     */
    let low = 0.05;
    let high = 0.95;
    let bestUnderTarget: Blob | null = null;

    for (let attempt = 0; attempt < 9; attempt++) {
      const quality = (low + high) / 2;

      const blob = await renderCurrentCropToCanvas(
        outputWidth,
        outputHeight,
        quality
      );

      if (blob.size <= targetBytes) {
        bestUnderTarget = blob;
        low = quality;
      } else {
        high = quality;
      }
    }

    if (bestUnderTarget) {
      return bestUnderTarget;
    }

    /*
     * If even very low quality cannot meet the requested target,
     * return the smallest practical JPEG we can create and report
     * the actual result to the user.
     */
    return renderCurrentCropToCanvas(
      outputWidth,
      outputHeight,
      0.05
    );
  };

  const downloadPhoto = async () => {
    if (!imageLoaded) {
      setError("Please upload a photo first.");
      return;
    }

    setIsPreparingDownload(true);
    setError("");

    try {
      const blob = await createCompressedPhoto();

      const targetBytes = getCompressionTarget();

      if (targetBytes && blob.size > targetBytes) {
        const targetLabel =
          compressionOption === "500"
            ? "500 KB"
            : compressionOption === "200"
              ? "200 KB"
              : "100 KB";

        setError(
          `The smallest practical JPEG is ${(
            blob.size / 1024
          ).toFixed(
            0
          )} KB, so the ${targetLabel} target could not be reached without excessive quality loss.`
        );
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const baseName =
        fileName
          .replace(/\.[^/.]+$/, "")
          .replace(/[<>:"/\\|?*]+/g, "_")
          .trim() || "passport-photo";

      link.href = url;
      link.download = `${baseName}-passport.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Passport photo export failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the passport photo."
      );
    } finally {
      setIsPreparingDownload(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-50 px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            MakeUdoc
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Passport Photo Maker
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-zinc-600">
            Crop and resize your photo into a passport-style
            photo directly in your browser.
          </p>
        </div>

        {/* Upload */}
        {!imageUrl && (
          <section className="mt-10 rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <label
              htmlFor="passport-photo-file"
              className="mx-auto flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-12 text-center transition hover:border-blue-400 hover:bg-blue-50"
            >
              <div className="text-5xl">📷</div>

              <h2 className="mt-4 text-lg font-semibold text-zinc-900">
                Upload your photo
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                JPG, JPEG, or PNG
              </p>

              <span className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">
                Choose Photo
              </span>

              <input
                id="passport-photo-file"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </section>
        )}

        {/* Editor */}
        {imageUrl && (
          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm sm:mt-10 sm:p-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
              {/* Crop editor */}
              <div>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">
                      Position your photo
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      Drag the image and use the zoom control to
                      position yourself inside the crop.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetPosition}
                    className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 sm:w-auto sm:py-2"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-6 flex w-full justify-center overflow-hidden rounded-2xl bg-zinc-100 p-2 sm:overflow-auto sm:p-6">
                  <div
                    className="relative max-w-full select-none overflow-hidden rounded-xl bg-white shadow-lg"
                    style={{
                      width: previewWidth,
                      height: previewHeight,
                      touchAction: "none",
                      cursor: dragRef.current.active
                        ? "grabbing"
                        : "grab",
                    }}
                    onPointerDown={startDragging}
                    onPointerMove={handleDragging}
                    onPointerUp={stopDragging}
                    onPointerCancel={stopDragging}
                  >
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="Uploaded passport photo"
                      onLoad={handleImageLoad}
                      draggable={false}
                      className="pointer-events-none absolute max-w-none opacity-0"
                      style={(() => {
                        const values = getDrawValues();

                        return values
                          ? {
                              width: values.drawWidth,
                              height: values.drawHeight,
                              left: values.x,
                              top: values.y,
                            }
                          : {
                              visibility: "hidden",
                            };
                      })()}
                    />

                    {/* Crop guide */}
                    <div className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]" />

                    <div className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-y-5 left-1/2 w-px bg-white/40" />

                    <canvas
                      ref={previewCanvasRef}
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div>
                <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">
                  Photo settings
                </h2>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-zinc-700">
                    Photo size
                  </p>

                  <div className="mt-3 space-y-3">
                    {PHOTO_SIZES.map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => {
                          setSelectedSizeId(size.id);
                          setPosition({ x: 0, y: 0 });
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selectedSizeId === size.id
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-zinc-200 bg-white hover:border-blue-300 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-zinc-900">
                              {size.label}
                            </p>

                            <p className="mt-1 text-sm text-zinc-500">
                              {size.widthMm} × {size.heightMm} mm
                            </p>
                          </div>

                          <span
                            className={`h-4 w-4 rounded-full border-2 ${
                              selectedSizeId === size.id
                                ? "border-blue-600 bg-blue-600"
                                : "border-zinc-300"
                            }`}
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-700">
                      Zoom
                    </p>

                    <span className="text-sm font-medium text-zinc-500">
                      {zoom.toFixed(2)}×
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) =>
                      setZoom(Number(event.target.value))
                    }
                    className="mt-4 w-full accent-blue-600"
                  />

                  <div className="mt-1 flex justify-between text-xs text-zinc-400">
                    <span>1×</span>
                    <span>3×</span>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-700">
                      Edit photo
                    </p>

                    <button
                      type="button"
                      onClick={resetAdjustments}
                      disabled={isPreparingDownload}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      Reset adjustments
                    </button>
                  </div>

                  <div className="mt-4 space-y-5 rounded-2xl bg-zinc-50 p-5">
                    <AdjustmentSlider
                      label="Brightness"
                      value={brightness}
                      min={-100}
                      max={100}
                      onChange={setBrightness}
                    />

                    <AdjustmentSlider
                      label="Contrast"
                      value={contrast}
                      min={-100}
                      max={100}
                      onChange={setContrast}
                    />

                    <AdjustmentSlider
                      label="Saturation"
                      value={saturation}
                      min={-100}
                      max={100}
                      onChange={setSaturation}
                    />

                    <AdjustmentSlider
                      label="Sharpness"
                      value={sharpness}
                      min={0}
                      max={100}
                      onChange={setSharpness}
                    />

                    <p className="text-xs leading-5 text-zinc-500">
                      Higher values enhance edges and fine details.
                      For passport photos, moderate sharpness is
                      usually best.
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <p className="text-sm font-semibold text-zinc-700">
                    File size
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {(
                      [
                        ["best", "Best quality", "No target size"],
                        ["500", "Under 500 KB", "Good quality"],
                        ["200", "Under 200 KB", "Smaller file"],
                        ["100", "Under 100 KB", "Smallest file"],
                      ] as [
                        CompressionOption,
                        string,
                        string
                      ][]
                    ).map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCompressionOption(value)}
                        disabled={isPreparingDownload}
                        className={`rounded-2xl border p-4 text-left transition ${
                          compressionOption === value
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-zinc-200 bg-white hover:border-blue-300 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-900">
                            {label}
                          </span>

                          <span
                            className={`h-4 w-4 rounded-full border-2 ${
                              compressionOption === value
                                ? "border-blue-600 bg-blue-600"
                                : "border-zinc-300"
                            }`}
                          />
                        </div>

                        <p className="mt-1 text-xs text-zinc-500">
                          {description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-7 rounded-2xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-800">
                    Selected format
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedSize.widthMm} × {selectedSize.heightMm} mm
                    · JPEG
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadPhoto}
                  disabled={isPreparingDownload}
                  className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {isPreparingDownload
                    ? "Preparing Photo..."
                    : "Download Passport Photo"}
                </button>

                <label
                  htmlFor="replace-passport-photo"
                  className="mt-3 block cursor-pointer rounded-xl border border-zinc-300 bg-white px-6 py-4 text-center font-semibold text-zinc-800 transition hover:border-blue-400 hover:bg-blue-50"
                >
                  Choose Another Photo

                  <input
                    id="replace-passport-photo"
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Privacy */}
        <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-center sm:p-8">
          <div className="text-3xl">🔒</div>

          <h3 className="mt-4 text-xl font-bold text-zinc-900">
            Your photo stays in your browser
          </h3>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            MakeUdoc processes your photo locally on your
            device. Your image does not need to be uploaded to
            a server.
          </p>
        </section>
      </div>
    </main>
  );
}