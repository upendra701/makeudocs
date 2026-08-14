import {
  PDFDocument,
  PageSizes,
  rgb,
} from "pdf-lib";
export type PdfQuality =
  | "standard"
  | "high"
  | "maximum";

export const PDF_QUALITY_SETTINGS: Record<
  PdfQuality,
  {
    label: string;
    description: string;
    jpegQuality: number;
  }
> = {
  standard: {
    label: "Standard",
    description:
      "Smaller file · Good quality",
    jpegQuality: 0.75,
  },

  high: {
    label: "High",
    description:
      "Balanced · Recommended",
    jpegQuality: 0.9,
  },

  maximum: {
    label: "Maximum",
    description:
      "Best quality · Larger file",
    jpegQuality: 0.98,
  },
};

export type PdfImage = {
  preview: string;
  rotation: number;
};

/*
 * A4 dimensions used by pdf-lib.
 */
export const A4_WIDTH =
  PageSizes.A4[0];

export const A4_HEIGHT =
  PageSizes.A4[1];

/*
 * Same margin used by:
 *
 * 1. PDF generator
 * 2. PDF preview
 *
 * Keeping this in one place prevents
 * preview/PDF mismatch.
 */
export const PDF_MARGIN = 24;

/*
 * Available drawing area.
 */
export const PDF_CONTENT_WIDTH =
  A4_WIDTH -
  PDF_MARGIN * 2;

export const PDF_CONTENT_HEIGHT =
  A4_HEIGHT -
  PDF_MARGIN * 2;

/*
 * Load image.
 */
function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Unable to load image."
          )
        );

      image.src = src;
    }
  );
}

/*
 * Process image rotation and convert
 * it into JPEG bytes.
 */
async function imageToJpegBytes(
  imageSrc: string,
  rotation: number,
  jpegQuality: number
): Promise<{
  bytes: Uint8Array;
  width: number;
  height: number;
}> {
  const image =
    await loadImage(
      imageSrc
    );

  const normalizedRotation =
    ((rotation % 360) +
      360) %
    360;

  const isQuarterTurn =
    normalizedRotation === 90 ||
    normalizedRotation === 270;

  const canvas =
    document.createElement(
      "canvas"
    );

  if (isQuarterTurn) {
    canvas.width =
      image.height;

    canvas.height =
      image.width;
  } else {
    canvas.width =
      image.width;

    canvas.height =
      image.height;
  }

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Could not create canvas context."
    );
  }

  /*
   * White background.
   */
  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  /*
   * Rotate around center.
   */
  context.save();

  context.translate(
    canvas.width / 2,
    canvas.height / 2
  );

  context.rotate(
    (normalizedRotation *
      Math.PI) /
      180
  );

  context.drawImage(
    image,
    -image.width / 2,
    -image.height / 2
  );

  context.restore();

  /*
   * JPEG quality.
   */
  const dataUrl =
  canvas.toDataURL(
    "image/jpeg",
    jpegQuality
  );

  const base64 =
    dataUrl.split(",")[1];

  if (!base64) {
    throw new Error(
      "Could not convert image."
    );
  }

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index <
    binary.length;
    index++
  ) {
    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return {
    bytes,
    width:
      canvas.width,
    height:
      canvas.height,
  };
}

/*
 * Calculate the exact dimensions
 * used inside the A4 PDF.
 *
 * This is also used by the preview.
 */
export function calculatePdfLayout(
  imageWidth: number,
  imageHeight: number
) {
  const scaleX =
    PDF_CONTENT_WIDTH /
    imageWidth;

  const scaleY =
    PDF_CONTENT_HEIGHT /
    imageHeight;

  /*
   * "Contain":
   *
   * Entire image remains visible.
   * No stretching.
   */
  const scale =
    Math.min(
      scaleX,
      scaleY
    );

  const width =
    imageWidth * scale;

  const height =
    imageHeight * scale;

  const x =
    (A4_WIDTH -
      width) /
    2;

  const y =
    (A4_HEIGHT -
      height) /
    2;

  return {
    x,
    y,
    width,
    height,
  };
}

/*
 * Create PDF.
 */
export async function createPdf(
  images: PdfImage[],
  quality: PdfQuality = "high"
): Promise<Uint8Array> {
  if (
    images.length === 0
  ) {
    throw new Error(
      "No images selected."
    );
  }

  const pdfDoc =
    await PDFDocument.create();

  for (const image of images) {
    const qualitySettings =
  PDF_QUALITY_SETTINGS[
    quality
  ];

const processed =
  await imageToJpegBytes(
    image.preview,
    image.rotation,
    qualitySettings.jpegQuality
  );

    const pdfImage =
      await pdfDoc.embedJpg(
        processed.bytes
      );

    /*
     * A4 page.
     */
    const page =
      pdfDoc.addPage([
        A4_WIDTH,
        A4_HEIGHT,
      ]);

    /*
     * White page background.
     */
    page.drawRectangle({
      x: 0,
      y: 0,
      width:
        A4_WIDTH,
      height:
        A4_HEIGHT,
      color: rgb(
        1,
        1,
        1
      ),
    });

    /*
     * EXACT same layout calculation
     * used by preview.
     */
    const layout =
      calculatePdfLayout(
        processed.width,
        processed.height
      );

    /*
     * Draw image.
     */
    page.drawImage(
      pdfImage,
      {
        x: layout.x,
        y: layout.y,
        width:
          layout.width,
        height:
          layout.height,
      }
    );
  }

  return pdfDoc.save();
}

/*
 * Download generated PDF.
 */
export async function downloadPdf(
  pdfBytes: Uint8Array,
  fileName =
    "MakeUdoc.pdf"
) {
  const blob =
    new Blob(
      [pdfBytes as BlobPart],
      {
        type:
          "application/pdf",
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    fileName;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  /*
   * Give browser a moment to
   * start the download before
   * releasing the URL.
   */
  setTimeout(() => {
    URL.revokeObjectURL(
      url
    );
  }, 1000);
}