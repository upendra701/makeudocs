"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Cropper, {
  Area,
} from "react-easy-crop";

import ReactCrop, {
  type PixelCrop,
} from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";

type CropEditorProps = {
  image: string;
  originalImage: string;
  onCancel: () => void;
  onApply: (croppedImage: string) => void;
};

type AspectOption = {
  label: string;
  value: number | undefined;
};

const aspectOptions: AspectOption[] = [
  {
    label: "✂️ Free Crop",
    value: undefined,
  },
  {
    label: "A4 Portrait",
    value: 210 / 297,
  },
  {
    label: "A4 Landscape",
    value: 297 / 210,
  },
  {
    label: "1 : 1",
    value: 1,
  },
];

/* =========================================================
   IMAGE HELPER
========================================================= */

function createImage(
  url: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Unable to load image."
          )
        );

      image.src = url;
    }
  );
}

/* =========================================================
   ROTATE IMAGE
========================================================= */

async function rotateImageToDataUrl(
  imageSrc: string,
  rotation: number
): Promise<string> {
  const image =
    await createImage(imageSrc);

  const radians =
    (rotation * Math.PI) / 180;

  const sin = Math.abs(
    Math.sin(radians)
  );

  const cos = Math.abs(
    Math.cos(radians)
  );

  const width =
    Math.round(
      image.width * cos +
        image.height * sin
    );

  const height =
    Math.round(
      image.width * sin +
        image.height * cos
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Could not create canvas context."
    );
  }

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    width,
    height
  );

  context.translate(
    width / 2,
    height / 2
  );

  context.rotate(
    radians
  );

  context.drawImage(
    image,
    -image.width / 2,
    -image.height / 2
  );

  return canvas.toDataURL(
    "image/jpeg",
    0.94
  );
}

/* =========================================================
   FINAL CROP GENERATOR
========================================================= */

async function getCroppedImage(
  imageSrc: string,
  pixelCrop: PixelCrop | Area,
  rotation: number
): Promise<string> {
  const rotatedImageSrc =
    await rotateImageToDataUrl(
      imageSrc,
      rotation
    );

  const image =
    await createImage(
      rotatedImageSrc
    );

  const cropX =
    Math.max(
      0,
      Math.round(pixelCrop.x)
    );

  const cropY =
    Math.max(
      0,
      Math.round(pixelCrop.y)
    );

  const cropWidth =
    Math.max(
      1,
      Math.round(
        pixelCrop.width
      )
    );

  const cropHeight =
    Math.max(
      1,
      Math.round(
        pixelCrop.height
      )
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    cropWidth;

  canvas.height =
    cropHeight;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Could not create output canvas context."
    );
  }

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    cropWidth,
    cropHeight
  );

  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return canvas.toDataURL(
    "image/jpeg",
    0.94
  );
}

/* =========================================================
   INITIAL FREE CROP
========================================================= */

function getInitialFreeCrop(
  width: number,
  height: number
): PixelCrop {
  /*
   * Start with a smaller selection.
   *
   * This gives the user room to move the
   * selection upward/downward/sideways.
   */
  const cropWidth =
    Math.round(width * 0.8);

  const cropHeight =
    Math.round(height * 0.8);

  const x =
    Math.round(
      (width - cropWidth) / 2
    );

  const y =
    Math.round(
      (height - cropHeight) / 2
    );

  return {
    unit: "px",
    x,
    y,
    width: cropWidth,
    height: cropHeight,
  };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function CropEditor({
  image,
  originalImage,
  onCancel,
  onApply,
}: CropEditorProps) {
  const [
    workingImage,
    setWorkingImage,
  ] = useState(image);

  const [crop, setCrop] =
    useState({
      x: 0,
      y: 0,
    });

  const [zoom, setZoom] =
    useState(1);

  const [rotation, setRotation] =
    useState(0);

  /*
   * undefined = Free Crop
   */
  const [aspect, setAspect] =
    useState<
      number | undefined
    >(undefined);

  const [
    croppedAreaPixels,
    setCroppedAreaPixels,
  ] = useState<Area | null>(
    null
  );

  /*
   * Free Crop selection.
   *
   * The selection itself can be moved
   * around the image by dragging inside it.
   */
  const [
    freeCrop,
    setFreeCrop,
  ] = useState<
    PixelCrop | undefined
  >(undefined);

  const [
    freeCropImage,
    setFreeCropImage,
  ] = useState(image);

  const [
    isRotatingFreeCrop,
    setIsRotatingFreeCrop,
  ] = useState(false);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const isFreeCrop =
    aspect === undefined;

  /* =======================================================
     LOCK BACKGROUND PAGE
  ======================================================= */

  useEffect(() => {
    const originalOverflow =
      document.body.style.overflow;

    const originalTouchAction =
      document.body.style.touchAction;

    document.body.style.overflow =
      "hidden";

    document.body.style.touchAction =
      "none";

    return () => {
      document.body.style.overflow =
        originalOverflow;

      document.body.style.touchAction =
        originalTouchAction;
    };
  }, []);

  /* =======================================================
     PREPARE FREE CROP IMAGE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function prepareFreeCrop() {
      if (!isFreeCrop) {
        return;
      }

      try {
        setIsRotatingFreeCrop(
          true
        );

        const rotated =
          await rotateImageToDataUrl(
            workingImage,
            rotation
          );

        if (cancelled) {
          return;
        }

        setFreeCropImage(
          rotated
        );

        const loaded =
          await createImage(
            rotated
          );

        if (cancelled) {
          return;
        }

        /*
         * Only create the initial crop
         * when entering Free Crop.
         *
         * Don't reset it every time the
         * user drags it.
         */
        setFreeCrop(
          (current) =>
            current ??
            getInitialFreeCrop(
              loaded.naturalWidth,
              loaded.naturalHeight
            )
        );
      } catch (error) {
        console.error(
          "Unable to prepare free crop:",
          error
        );
      } finally {
        if (!cancelled) {
          setIsRotatingFreeCrop(
            false
          );
        }
      }
    }

    prepareFreeCrop();

    return () => {
      cancelled = true;
    };
  }, [
    isFreeCrop,
    workingImage,
    rotation,
  ]);

  /* =======================================================
     FIXED CROP
  ======================================================= */

  const onCropComplete =
    useCallback(
      (
        _croppedArea: Area,
        croppedPixels: Area
      ) => {
        setCroppedAreaPixels(
          croppedPixels
        );
      },
      []
    );

  /* =======================================================
     CROP MODE
  ======================================================= */

  const selectAspect = (
    value: number | undefined
  ) => {
    setAspect(value);

    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);

    setCroppedAreaPixels(
      null
    );

    if (
      value === undefined
    ) {
      setFreeCrop(undefined);
    }
  };

  /* =======================================================
     ROTATION
  ======================================================= */

  const rotateLeft = () => {
    setRotation(
      (current) => {
        const next =
          current - 90;

        return next < -360
          ? next + 360
          : next;
      }
    );
  };

  const rotateRight = () => {
    setRotation(
      (current) => {
        const next =
          current + 90;

        return next > 360
          ? next - 360
          : next;
      }
    );
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetEditor = () => {
    setWorkingImage(
      originalImage
    );

    setCrop({
      x: 0,
      y: 0,
    });

    setZoom(1);

    setRotation(0);

    setAspect(undefined);

    setCroppedAreaPixels(
      null
    );

    setFreeCrop(undefined);

    setFreeCropImage(
      originalImage
    );
  };

  /* =======================================================
     APPLY
  ======================================================= */

  const handleApply = async () => {
    try {
      setIsProcessing(true);

      /*
       * FREE CROP
       */
      if (isFreeCrop) {
        if (!freeCrop) {
          alert(
            "Please select an area to crop."
          );

          return;
        }

        const displayedImage =
  document.querySelector(
    'img[alt="Free crop"]'
  ) as HTMLImageElement | null;

if (!displayedImage) {
  alert(
    "Unable to read crop image."
  );
  return;
}

const naturalWidth =
  displayedImage.naturalWidth;

const naturalHeight =
  displayedImage.naturalHeight;

const renderedWidth =
  displayedImage.clientWidth;

const renderedHeight =
  displayedImage.clientHeight;

if (
  !renderedWidth ||
  !renderedHeight
) {
  alert(
    "Unable to calculate crop area."
  );
  return;
}

const scaleX =
  naturalWidth /
  renderedWidth;

const scaleY =
  naturalHeight /
  renderedHeight;

const actualCrop: PixelCrop = {
  unit: "px",

  x: Math.round(
    (freeCrop?.x ?? 0) *
      scaleX
  ),

  y: Math.round(
    (freeCrop?.y ?? 0) *
      scaleY
  ),

  width: Math.round(
    (freeCrop?.width ?? 0) *
      scaleX
  ),

  height: Math.round(
    (freeCrop?.height ?? 0) *
      scaleY
  ),
};

const result =
  await getCroppedImage(
    freeCropImage,
    actualCrop,
    0
);

onApply(result);
        return;
      }

      /*
       * FIXED RATIO CROP
       */
      if (
        !croppedAreaPixels
      ) {
        alert(
          "Please select a crop area."
        );

        return;
      }

      const result =
        await getCroppedImage(
          workingImage,
          croppedAreaPixels,
          rotation
        );

      onApply(result);
    } catch (error) {
      console.error(
        "Image editing failed:",
        error
      );

      alert(
        "Unable to edit this image. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /* =======================================================
     IMAGE LOAD
  ======================================================= */

  const handleFreeCropImageLoad =
    (
      event: React.SyntheticEvent<HTMLImageElement>
    ) => {
      const target =
        event.currentTarget;

      /*
       * If ReactCrop has no selection,
       * create one.
       */
      setFreeCrop(
        (current) =>
          current ??
          getInitialFreeCrop(
            target.naturalWidth,
            target.naturalHeight
          )
      );
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-5"
      style={{
        touchAction: "none",
      }}
    >
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 sm:px-5 sm:py-4">

          <div className="min-w-0">

            <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">
              Edit image
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
              Crop, zoom and rotate
              your image.
            </p>

          </div>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl text-zinc-600 transition hover:bg-zinc-200"
            aria-label="Close editor"
          >
            ×
          </button>

        </div>

        {/* =================================================
            CROP AREA
        ================================================= */}

        <div
  className="relative h-[46vh] min-h-[300px] shrink-0 overflow-hidden bg-zinc-950 sm:h-[50vh]"
  style={{
    touchAction: "none",
    overscrollBehavior: "contain",
  }}
>

          {isFreeCrop ? (
  <>
    {isRotatingFreeCrop ? (
      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-white">
        Preparing crop...
      </div>
    ) : (
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden bg-zinc-950"
        style={{
          touchAction: "none",
          overscrollBehavior:
            "contain",
        }}
      >
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={{
            touchAction: "none",
          }}
        >
          <ReactCrop
            crop={freeCrop}
            onChange={(nextCrop) => {
              setFreeCrop(nextCrop);
            }}
            onComplete={(nextCrop) => {
              setFreeCrop(nextCrop);
            }}
            keepSelection
            minWidth={20}
            minHeight={20}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              touchAction: "none",
            }}
          >
            <img
              src={freeCropImage}
              alt="Free crop"
              onLoad={
                handleFreeCropImageLoad
              }
              draggable={false}
              style={{
                display: "block",

                /*
                 * Fit the WHOLE image
                 * inside the available viewport.
                 */
                width: "auto",
                height: "auto",

                maxWidth:
                  "calc(100vw - 32px)",

                maxHeight:
                  "calc(40vh - 32px)",

                objectFit:
                  "contain",

                userSelect:
                  "none",

                WebkitUserSelect:
                  "none",

                touchAction:
                  "none",
              }}
            />
          </ReactCrop>
        </div>
      </div>
    )}

    <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm sm:text-xs">
      ✂️ Free Crop — drag image / crop area
    </div>
  </>
) : (
            <Cropper
              image={
                workingImage
              }
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape="rect"
              showGrid
              restrictPosition
              objectFit="contain"
              onCropChange={
                setCrop
              }
              onZoomChange={
                setZoom
              }
              onRotationChange={
                setRotation
              }
              onCropComplete={
                onCropComplete
              }
            />
          )}

        </div>

        {/* =================================================
            CONTROLS
        ================================================= */}

        <div
          className="min-h-0 overflow-y-auto bg-white p-4 sm:p-5"
          style={{
            touchAction:
              "pan-y",
          }}
        >

          {/* =================================================
              CROP FORMAT
          ================================================= */}

          <div>

            <div className="mb-2 flex items-center justify-between">

              <label className="text-sm font-semibold text-zinc-800">
                Crop format
              </label>

              <span className="text-xs text-zinc-400">
                {isFreeCrop
                  ? "Any size"
                  : "Fixed shape"}
              </span>

            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">

              {aspectOptions.map(
                (option) => {
                  const selected =
                    aspect ===
                    option.value;

                  return (
                    <button
                      key={
                        option.label
                      }
                      type="button"
                      onClick={() =>
                        selectAspect(
                          option.value
                        )
                      }
                      className={`shrink-0 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {
                        option.label
                      }
                    </button>
                  );
                }
              )}

            </div>

            {isFreeCrop && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">

                <p className="text-xs leading-5 text-blue-700">
                  <strong>
                    Free Crop:
                  </strong>{" "}
                  Drag the crop area
                  up, down, left or
                  right. Drag the
                  corners or edges to
                  resize it.
                </p>

              </div>
            )}

          </div>

          {/* =================================================
              ZOOM
          ================================================= */}

          <div className="mt-5">

            <div className="mb-2 flex items-center justify-between">

              <label className="text-sm font-semibold text-zinc-800">
                Zoom
              </label>

              <span className="rounded-md bg-zinc-100 px-2 py-1 text-sm text-zinc-500">
                {zoom.toFixed(1)}×
              </span>

            </div>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(
                event
              ) =>
                setZoom(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              className="w-full accent-blue-600"
            />

          </div>

          {/* =================================================
              ROTATION
          ================================================= */}

          <div className="mt-5">

            <div className="mb-2 flex items-center justify-between">

              <label className="text-sm font-semibold text-zinc-800">
                Rotation
              </label>

              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                {rotation}°
              </span>

            </div>

            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotation}
              onChange={(
                event
              ) =>
                setRotation(
                  Number(
                    event.target
                      .value
                  )
                )
              }
              className="w-full accent-blue-600"
            />

            <div className="mt-3 flex flex-wrap gap-2">

              <button
                type="button"
                onClick={
                  rotateLeft
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                ↺ 90°
              </button>

              <button
                type="button"
                onClick={
                  rotateRight
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
              >
                90° ↻
              </button>

            </div>

          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <button
              type="button"
              onClick={
                resetEditor
              }
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
            >
              ↩ Reset to original
            </button>

            <div className="flex gap-3">

              <button
                type="button"
                onClick={
                  onCancel
                }
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] sm:flex-none sm:px-6"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleApply
                }
                disabled={
                  isProcessing ||
                  (isFreeCrop
                    ? !freeCrop
                    : !croppedAreaPixels)
                }
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-7"
              >
                {isProcessing
                  ? "Applying..."
                  : "Apply changes"}
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}