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
      const tables = Array.from(
        page.querySelectorAll<HTMLTableElement>("table")
      );

      console.log("[Stage4C] PAGE GEOMETRY", {
        canvasHeight: canvas.height,
        canvasWidth: canvas.width,
        pageHeight: pageRect.height,
        cssToCanvasScale,
        a4MaxCanvasHeight,
      });

      tables.forEach((table, index) => {
        const tableRect = table.getBoundingClientRect();

        const tableTop =
          (tableRect.top - pageRect.top) * cssToCanvasScale;

        const tableBottom =
          (tableRect.bottom - pageRect.top) * cssToCanvasScale;

        const tableHeight =
          tableRect.height * cssToCanvasScale;

        console.log("[Stage4C] TABLE", index, {
          tableTop,
          tableBottom,
          tableHeight,
          a4MaxCanvasHeight,
          fitsOneA4Page:
            tableHeight <= a4MaxCanvasHeight + 8,
        });
      });
      const isDocxHeading = (element: HTMLElement) =>
        /^H[1-6]$/.test(element.tagName) ||
        /^docx-preview_heading\d+$/.test(
          typeof element.className === "string"
            ? element.className
            : ""
        );

      const atomicNodes = Array.from(
        page.querySelectorAll<HTMLElement>(
          "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, table"
        )
      ).filter((element) => {
        // Anything inside a table is controlled by the table itself.
        if (element.closest("table") && element.tagName !== "TABLE") {
          return false;
        }

        return true;
      });

      const boundaries = new Set<number>([0, canvas.height]);

      const addBoundary = (y: number) => {
        if (y > 10 && y < canvas.height - 10) {
          boundaries.add(Math.round(y));
        }
      };

      // Normal blocks remain atomic.
      //
      // Headings are special: their top remains a valid boundary,
      // but their bottom is intentionally NOT a boundary.
      //
      // This keeps a heading together with the content that follows it.
      // Otherwise a page could end with:
      //
      //   9. Relevant Libraries
      //
      // and the actual list could begin on the next page.
      atomicNodes.forEach((el) => {
        const r = el.getBoundingClientRect();

        const top =
          (r.top - pageRect.top) * cssToCanvasScale;

        const bottom =
          (r.bottom - pageRect.top) * cssToCanvasScale;

        addBoundary(top);

        const isHeading = isDocxHeading(el);

        if (!isHeading) {
          addBoundary(bottom + 2);
        }
      });

      // Normal-sized tables remain completely atomic.
      //
      // Only a table that is itself taller than one A4 page
      // receives internal row boundaries.
      tables.forEach((table) => {
        const tableRect = table.getBoundingClientRect();

        const tableHeight =
          tableRect.height * cssToCanvasScale;

        if (tableHeight <= a4MaxCanvasHeight + 8) {
          return;
        }

        const rows = Array.from(
          table.querySelectorAll<HTMLTableRowElement>("tr")
        );

        rows.forEach((row) => {
          const rowRect = row.getBoundingClientRect();

          const rowTop =
            (rowRect.top - pageRect.top) * cssToCanvasScale;

          const rowBottom =
            (rowRect.bottom - pageRect.top) * cssToCanvasScale;

          addBoundary(rowTop);
          addBoundary(rowBottom + 2);
        });
      });
      const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
      let currentY = 0;

      while (currentY < canvas.height - 2) {
        const maxAllowedY = currentY + a4MaxCanvasHeight;

        if (maxAllowedY >= canvas.height) {
          await addSliceToA4Pdf(canvas, currentY, canvas.height - currentY);
          break;
        }

        // -------------------------------------------------
        // Table look-ahead
        //
        // If a normal-sized table starts before the A4
        // boundary but ends after it, do not cut through
        // the table. Move the whole table to the next page.
        //
        // Oversized tables are intentionally excluded here;
        // their row boundaries remain available for splitting.
        // -------------------------------------------------

        // -------------------------------------------------
        // Atomic block look-ahead
        //
        // If a normal text block crosses the A4 boundary,
        // do not slice through the middle of that block.
        //
        // This protects paragraphs, headings, list items,
        // blockquotes, and preformatted text.
        // Tables are handled separately below.
        // -------------------------------------------------

        // -------------------------------------------------
        // Heading + next-block look-ahead
        //
        // A heading should stay with the first content block
        // that follows it. If that following block cannot fit
        // on the current A4 page, move the heading as well.
        // -------------------------------------------------

        let headingBreakY: number | null = null;

        for (let i = 0; i < atomicNodes.length - 1; i++) {
          const heading = atomicNodes[i];

          if (!isDocxHeading(heading)) {
            continue;
          }

          const nextNode = atomicNodes[i + 1];

          const headingRect = heading.getBoundingClientRect();
          const nextRect = nextNode.getBoundingClientRect();

          const headingTop =
            (headingRect.top - pageRect.top) * cssToCanvasScale;

          const nextBottom =
            (nextRect.bottom - pageRect.top) * cssToCanvasScale;

          const headingIsOnCurrentPage =
            headingTop > currentY + 10 &&
            headingTop < maxAllowedY;

          const followingBlockDoesNotFit =
            nextBottom > maxAllowedY;

          if (
            headingIsOnCurrentPage &&
            followingBlockDoesNotFit
          ) {
            headingBreakY =
              headingBreakY === null
                ? headingTop
                : Math.min(headingBreakY, headingTop);
          }
        }
        let atomicBreakY: number | null = null;

        for (const node of atomicNodes) {
          if (node.tagName === "TABLE") {
            continue;
          }

          const nodeRect = node.getBoundingClientRect();

          const nodeTop =
            (nodeRect.top - pageRect.top) * cssToCanvasScale;

          const nodeBottom =
            (nodeRect.bottom - pageRect.top) * cssToCanvasScale;

          const startsAfterCurrentPage =
            nodeTop > currentY + 10;

          const crossesPageBoundary =
            nodeTop < maxAllowedY &&
            nodeBottom > maxAllowedY;

          if (
            startsAfterCurrentPage &&
            crossesPageBoundary
          ) {
            atomicBreakY =
              atomicBreakY === null
                ? nodeTop
                : Math.min(atomicBreakY, nodeTop);
          }
        }
        let tableBreakY: number | null = null;

        for (const table of tables) {
          const tableRect = table.getBoundingClientRect();

          const tableTop =
            (tableRect.top - pageRect.top) * cssToCanvasScale;

          const tableBottom =
            (tableRect.bottom - pageRect.top) * cssToCanvasScale;

          const tableHeight =
            tableRect.height * cssToCanvasScale;

          const isNormalSizedTable =
            tableHeight <= a4MaxCanvasHeight + 8;

          const startsAfterCurrentPage =
            tableTop > currentY + 10;

          const crossesPageBoundary =
            tableTop < maxAllowedY &&
            tableBottom > maxAllowedY;

          if (
            isNormalSizedTable &&
            startsAfterCurrentPage &&
            crossesPageBoundary
          ) {
            // Keep the table with the section heading that introduces it.
            //
            // The DOCX preview uses one article for the whole document,
            // so we deliberately search only the preceding heading rather
            // than treating the article itself as an atomic block.
            const precedingHeadings = Array.from(
              page.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")
            )
              .map((heading) => {
                const rect = heading.getBoundingClientRect();

                return {
                  heading,
                  top:
                    (rect.top - pageRect.top) * cssToCanvasScale,
                  bottom:
                    (rect.bottom - pageRect.top) * cssToCanvasScale,
                };
              })
              .filter(
                (item) =>
                  item.bottom <= tableTop + 4 &&
                  item.top > currentY + 10
              );

            const nearestHeading =
              precedingHeadings.length > 0
                ? precedingHeadings[precedingHeadings.length - 1]
                : null;

            const sectionBreakY =
              nearestHeading?.top ?? tableTop;

            tableBreakY =
              tableBreakY === null
                ? sectionBreakY
                : Math.min(tableBreakY, sectionBreakY);
          }
        }

        const candidates = sortedBoundaries.filter(
          (b) => b > currentY + a4MaxCanvasHeight * 0.4 && b <= maxAllowedY
        );

        let chosenY: number;

        if (headingBreakY !== null) {
          chosenY = headingBreakY;
        } else if (atomicBreakY !== null) {
          chosenY = atomicBreakY;
        } else if (tableBreakY !== null) {
          chosenY = tableBreakY;
        } else if (candidates.length > 0) {
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
