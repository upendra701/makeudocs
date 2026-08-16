import { PDFDocument } from "pdf-lib";

export async function convertRenderedDocxToPdf(container: HTMLElement): Promise<Uint8Array> {
  const html2canvas = (await import("html2canvas")).default;

  const getElementRect = (element: HTMLElement) => element.getBoundingClientRect();

  const isVisible = (element: HTMLElement) => {
    const rect = getElementRect(element);
    const computed = window.getComputedStyle(element);
    return (
      rect.width > 200 &&
      rect.height > 200 &&
      computed.display !== "none" &&
      computed.visibility !== "hidden"
    );
  };

  const wrapper =
    container.querySelector<HTMLElement>(".docx-wrapper") ??
    container.querySelector<HTMLElement>(".docx-preview-wrapper") ??
    container.querySelector<HTMLElement>('[class$="-wrapper"]');

  let pages: HTMLElement[] = wrapper
    ? Array.from(wrapper.children).filter(
        (element): element is HTMLElement =>
          element.tagName.toLowerCase() === "section" && isVisible(element as HTMLElement)
      )
    : [];

  if (pages.length === 0) {
    pages = Array.from(container.children).filter(
      (element): element is HTMLElement =>
        element.tagName.toLowerCase() === "section" && isVisible(element as HTMLElement)
    );
  }

  if (pages.length === 0) {
    const sections = Array.from(container.querySelectorAll<HTMLElement>("section")).filter(isVisible);
    pages = sections.filter(
      (element) =>
        !sections.some((parent) => parent !== element && parent.contains(element))
    );
  }

  if (pages.length === 0) {
    throw new Error("No rendered Word pages were found.");
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

  const pdf = await PDFDocument.create();
  const A4_WIDTH_PT = 595.28;
  const A4_HEIGHT_PT = 841.89;
  const renderScale = 3;

  const captureEditableState = (page: HTMLElement) =>
    Array.from(page.querySelectorAll<HTMLElement>('[contenteditable="true"]')).map(
      (element) => ({
        element,
        value: element.getAttribute("contenteditable"),
      })
    );

  const restoreEditableState = (
    elements: ReturnType<typeof captureEditableState>
  ) => {
    elements.forEach(({ element, value }) => {
      if (value === null) element.removeAttribute("contenteditable");
      else element.setAttribute("contenteditable", value);
    });
  };

  const addSliceToA4Pdf = async (
    sourceCanvas: HTMLCanvasElement,
    sourceY: number,
    sourceHeight: number
  ) => {
    if (sourceHeight <= 1) return;

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = Math.ceil(sourceHeight);

    const context = outputCanvas.getContext("2d");
    if (!context) throw new Error("Unable to create PDF canvas context.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    context.drawImage(
      sourceCanvas,
      0,
      sourceY,
      sourceCanvas.width,
      sourceHeight,
      0,
      0,
      sourceCanvas.width,
      sourceHeight
    );

    const imageData = outputCanvas.toDataURL("image/png");
    const image = await pdf.embedPng(imageData);
    const pdfPage = pdf.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    const renderedHeightPt = (sourceHeight / sourceCanvas.width) * A4_WIDTH_PT;

    pdfPage.drawImage(image, {
      x: 0,
      y: A4_HEIGHT_PT - renderedHeightPt,
      width: A4_WIDTH_PT,
      height: renderedHeightPt,
    });
  };

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const originalRect = page.getBoundingClientRect();
    if (originalRect.width <= 0 || originalRect.height <= 0) continue;

    const editableElements = captureEditableState(page);
    const activeElement = document.activeElement as HTMLElement | null;

    window.getSelection()?.removeAllRanges();
    editableElements.forEach(({ element }) => element.setAttribute("contenteditable", "false"));
    activeElement?.blur();

    try {
      const canvas = await html2canvas(page, {
        scale: renderScale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 20000,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll("section").forEach((element) => {
            (element as HTMLElement).style.boxShadow = "none";
          });

          const sections = clonedDocument.querySelectorAll("section");
          sections.forEach((sec) => {
            const walker = clonedDocument.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
            let node = walker.nextNode();
            while (node) {
              const textNode = node as Text;
              const parent = textNode.parentElement;
              if (parent) {
                if (
                  parent.tagName === "SPAN" &&
                  parent.nextElementSibling &&
                  parent.nextElementSibling.tagName === "SPAN" &&
                  textNode.textContent &&
                  !textNode.textContent.endsWith(" ") &&
                  !parent.nextElementSibling.textContent?.startsWith(" ")
                ) {
                  const isWordChar = /[\w\d.,;?!]$/.test(textNode.textContent);
                  const nextStartsWord = /^[\w\d]/.test(parent.nextElementSibling.textContent || "");
                  if (isWordChar && nextStartsWord) parent.style.marginRight = "0.25em";
                }
              }
              node = walker.nextNode();
            }
          });
        },
      });

      const a4MaxCanvasHeight = (canvas.width * A4_HEIGHT_PT) / A4_WIDTH_PT;

      if (canvas.height <= a4MaxCanvasHeight + 8) {
        await addSliceToA4Pdf(canvas, 0, canvas.height);
        continue;
      }

      const pageRect = page.getBoundingClientRect();
      const cssToCanvasScale = canvas.height / Math.max(1, pageRect.height);

      const atomicNodes = Array.from(
        page.querySelectorAll<HTMLElement>(
          "tr, p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, table"
        )
      ).filter((element) => {
        if (element.closest("tr") && element.tagName !== "TR") return false;
        return true;
      });

      const boundaries = new Set<number>([0, canvas.height]);
      atomicNodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = Math.round((r.top - pageRect.top) * cssToCanvasScale);
        const bottom = Math.round((r.bottom - pageRect.top) * cssToCanvasScale);
        if (top > 10 && top < canvas.height - 10) boundaries.add(top);
        if (bottom > 10 && bottom < canvas.height - 10) boundaries.add(bottom + 2);
      });

      const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
      let currentY = 0;

      while (currentY < canvas.height - 2) {
        const maxAllowedY = currentY + a4MaxCanvasHeight;

        if (maxAllowedY >= canvas.height) {
          await addSliceToA4Pdf(canvas, currentY, canvas.height - currentY);
          break;
        }

        const candidates = sortedBoundaries.filter(
          (b) => b > currentY + a4MaxCanvasHeight * 0.4 && b <= maxAllowedY
        );

        let chosenY: number;
        if (candidates.length > 0) {
          chosenY = candidates[candidates.length - 1];
        } else {
          const backwardsCandidate = sortedBoundaries
            .filter((b) => b > currentY + 10 && b <= maxAllowedY)
            .pop();
          chosenY = backwardsCandidate ?? maxAllowedY;
        }

        await addSliceToA4Pdf(canvas, currentY, chosenY - currentY);
        currentY = chosenY;
      }
    } finally {
      restoreEditableState(editableElements);
    }
  }

  return pdf.save();
}
