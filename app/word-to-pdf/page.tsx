"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { PDFDocument } from "pdf-lib";

type PdfResult = {
  url: string;
  fileName: string;
};

export default function WordToPdfPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const previewContainerRef =
    useRef<HTMLDivElement | null>(null);

  const editorHistoryRef =
    useRef<string[]>([]);

  const editorHistoryIndexRef =
    useRef(-1);

  const editorRestoringHistoryRef =
    useRef(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isDragging, setIsDragging] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isRendering, setIsRendering] =
    useState(false);

  const [renderError, setRenderError] =
    useState("");

  const [isConverting, setIsConverting] =
    useState(false);

  const [isEditingText, setIsEditingText] =
    useState(false);

  const [editorSelectionActive, setEditorSelectionActive] =
    useState(false);

  const [editorFontSize, setEditorFontSize] =
    useState("16px");

  const [pdfResult, setPdfResult] =
    useState<PdfResult | null>(null);

  const [pdfFileName, setPdfFileName] =
    useState("");

  /* =====================================================
     FILE SIZE
  ===================================================== */

  const formatFileSize = (
    bytes: number
  ) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  /* =====================================================
     FILE HANDLER
  ===================================================== */

  const handleFile = (
    file: File
  ) => {
    setError("");
    setRenderError("");

    /*
     * Remove previous PDF result.
     */
    if (pdfResult) {
      URL.revokeObjectURL(
        pdfResult.url
      );
    }

    setPdfResult(null);
    setPdfFileName("");
    setIsEditingText(false);
    setEditorSelectionActive(false);
    setEditorFontSize("16px");
    resetEditorHistory();

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      extension !== "docx"
    ) {
      setSelectedFile(null);

      setError(
        "Please select a Word .docx file."
      );

      return;
    }

    setSelectedFile(file);
  };

  /* =====================================================
     FILE INPUT
  ===================================================== */

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    handleFile(file);
  };

  /* =====================================================
     DRAG & DROP
  ===================================================== */

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    handleFile(file);
  };

  /* =====================================================
     REMOVE FILE
  ===================================================== */

  const removeFile = () => {
    if (pdfResult) {
      URL.revokeObjectURL(
        pdfResult.url
      );
    }

    setSelectedFile(null);
    setError("");
    setRenderError("");
    setPdfResult(null);
    setPdfFileName("");
    setIsEditingText(false);
    setEditorSelectionActive(false);
    setEditorFontSize("16px");
    resetEditorHistory();

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }

    if (
      previewContainerRef.current
    ) {
      previewContainerRef.current.innerHTML =
        "";
    }
  };

  /* =====================================================
     DOCX TABLE LAYOUT NORMALIZER — V3
  ===================================================== */

  const normalizeDocxTableLayout =
    async (
      container: HTMLElement
    ) => {
      if (
        "fonts" in document &&
        document.fonts?.ready
      ) {
        await document.fonts.ready;
      }

      await new Promise<void>(
        (resolve) =>
          requestAnimationFrame(
            () =>
              requestAnimationFrame(
                () => resolve()
              )
          )
      );

      const tables =
        Array.from(
          container.querySelectorAll<HTMLTableElement>(
            "table"
          )
        );

      tables.forEach(
        (table) => {
          /*
           * Important:
           * docx-preview can put Word's fixed row heights
           * and overflow rules directly on the generated
           * table elements. CSS alone is not always enough.
           *
           * We remove those constraints at the DOM level,
           * then let the browser calculate the real height
           * from the wrapped text.
           */
          table.removeAttribute(
            "height"
          );

          table.style.setProperty(
            "height",
            "auto",
            "important"
          );

          table.style.setProperty(
            "max-height",
            "none",
            "important"
          );

          table.style.setProperty(
            "overflow",
            "visible",
            "important"
          );

          table.style.setProperty(
            "border-collapse",
            "collapse",
            "important"
          );

          const rows =
            Array.from(
              table.querySelectorAll<HTMLTableRowElement>(
                "tr"
              )
            );

          rows.forEach(
            (row) => {
              row.removeAttribute(
                "height"
              );

              row.style.setProperty(
                "height",
                "auto",
                "important"
              );

              row.style.setProperty(
                "min-height",
                "0",
                "important"
              );

              row.style.setProperty(
                "max-height",
                "none",
                "important"
              );

              row.style.setProperty(
                "overflow",
                "visible",
                "important"
              );

              const cells =
                Array.from(
                  row.children
                ).filter(
                  (
                    child
                  ): child is HTMLTableCellElement =>
                    child instanceof
                      HTMLTableCellElement
                );

              cells.forEach(
                (cell) => {
                  cell.removeAttribute(
                    "height"
                  );

                  cell.style.setProperty(
                    "height",
                    "auto",
                    "important"
                  );

                  cell.style.setProperty(
                    "min-height",
                    "0",
                    "important"
                  );

                  cell.style.setProperty(
                    "max-height",
                    "none",
                    "important"
                  );

                  cell.style.setProperty(
                    "overflow",
                    "visible",
                    "important"
                  );

                  cell.style.setProperty(
                    "white-space",
                    "normal",
                    "important"
                  );

                  cell.style.setProperty(
                    "overflow-wrap",
                    "break-word",
                    "important"
                  );

                  cell.style.setProperty(
                    "word-break",
                    "normal",
                    "important"
                  );

                  cell.style.setProperty(
                    "vertical-align",
                    "top",
                    "important"
                  );

                  /*
                   * Remove height constraints from every
                   * generated text wrapper inside the cell.
                   */
                  const descendants =
                    Array.from(
                      cell.querySelectorAll<HTMLElement>(
                        "*"
                      )
                    );

                  descendants.forEach(
                    (node) => {
                      node.style.setProperty(
                        "height",
                        "auto",
                        "important"
                      );

                      node.style.setProperty(
                        "min-height",
                        "0",
                        "important"
                      );

                      node.style.setProperty(
                        "max-height",
                        "none",
                        "important"
                      );

                      node.style.setProperty(
                        "overflow",
                        "visible",
                        "important"
                      );

                      node.style.setProperty(
                        "white-space",
                        "normal",
                        "important"
                      );

                      node.style.setProperty(
                        "overflow-wrap",
                        "break-word",
                        "important"
                      );
                    }
                  );
                }
              );
            }
          );

          /*
           * Force one complete browser layout before measuring.
           */
          void table.offsetHeight;

          rows.forEach(
            (row) => {
              const cells =
                Array.from(
                  row.children
                ).filter(
                  (
                    child
                  ): child is HTMLTableCellElement =>
                    child instanceof
                      HTMLTableCellElement
                );

              let tallest =
                0;

              cells.forEach(
                (cell) => {
                  /*
                   * scrollHeight catches wrapped content.
                   * getBoundingClientRect catches content that
                   * is laid out but has no scroll overflow.
                   */
                  tallest =
                    Math.max(
                      tallest,
                      Math.ceil(
                        cell.scrollHeight
                      ),
                      Math.ceil(
                        cell.getBoundingClientRect()
                          .height
                      )
                    );
                }
              );

              if (
                tallest >
                0
              ) {
                row.style.setProperty(
                  "height",
                  "auto",
                  "important"
                );

                cells.forEach(
                  (cell) => {
                    cell.style.setProperty(
                      "height",
                      "auto",
                      "important"
                    );
                  }
                );
              }
            }
          );

          /*
           * Let the table recalculate once more after explicit
           * row sizing, then expand any row that still grew.
           */
          void table.offsetHeight;

          rows.forEach(
            (row) => {
              const cells =
                Array.from(
                  row.children
                ).filter(
                  (
                    child
                  ): child is HTMLTableCellElement =>
                    child instanceof
                      HTMLTableCellElement
                );

              let tallest =
                0;

              cells.forEach(
                (cell) => {
                  tallest =
                    Math.max(
                      tallest,
                      Math.ceil(
                        cell.scrollHeight
                      ),
                      Math.ceil(
                        cell.getBoundingClientRect()
                          .height
                      )
                    );
                }
              );

              const current =
                row.getBoundingClientRect()
                  .height;

              if (
                tallest >
                current + 1
              ) {
                row.style.setProperty(
                  "height",
                  "auto",
                  "important"
                );

                cells.forEach(
                  (cell) => {
                    cell.style.setProperty(
                      "height",
                      "auto",
                      "important"
                    );
                  }
                );
              }
            }
          );
        }
      );

      /*
       * One final paint before the preview becomes available.
       */
      await new Promise<void>(
        (resolve) =>
          requestAnimationFrame(
            () => resolve()
          )
      );
    };

  /* =====================================================
     RENDER DOCX
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function renderDocument() {
      if (
        !selectedFile ||
        !previewContainerRef.current
      ) {
        return;
      }

      setIsRendering(true);
      setRenderError("");

      const container =
        previewContainerRef.current;

      container.innerHTML = "";

      try {
        const {
          renderAsync,
        } = await import(
          "docx-preview"
        );

        if (cancelled) {
          return;
        }

        await renderAsync(
          selectedFile,
          container,
          undefined,
          {
            className:
              "docx-preview",

            inWrapper: true,

            breakPages: true,

            ignoreLastRenderedPageBreak:
              false,

            experimental:
              false,

            useBase64URL:
              true,

            renderHeaders:
              true,

            renderFooters:
              true,

            renderFootnotes:
              true,

            renderEndnotes:
              true,
          }
        );

        if (cancelled) {
          return;
        }

        await normalizeDocxTableLayout(
          container
        );

        if (cancelled) {
          return;
        }
      } catch (error) {
        console.error(
          "DOCX preview failed:",
          error
        );

        if (!cancelled) {
          setRenderError(
            "Unable to preview this Word document. Please try another .docx file."
          );
        }
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    renderDocument();

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  /* =====================================================
     TEXT EDITING TOOLS
  ===================================================== */

  const getEditorSnapshot =
    () => {
      const container =
        previewContainerRef.current;

      if (!container) {
        return "";
      }

      return Array.from(
        container.querySelectorAll<HTMLElement>(
          "section"
        )
      )
        .map(
          (section) =>
            section.innerHTML
        )
        .join(
          "\n<!-- MAKEUDOC_PAGE_SEPARATOR -->\n"
        );
    };

  const restoreEditorSnapshot =
    (
      snapshot: string
    ) => {
      const container =
        previewContainerRef.current;

      if (!container) {
        return;
      }

      const pages =
        Array.from(
          container.querySelectorAll<HTMLElement>(
            "section"
          )
        );

      const parts =
        snapshot.split(
          "\n<!-- MAKEUDOC_PAGE_SEPARATOR -->\n"
        );

      editorRestoringHistoryRef.current =
        true;

      pages.forEach(
        (page, index) => {
          page.innerHTML =
            parts[index] ??
            "";
        }
      );

      editorRestoringHistoryRef.current =
        false;

      window.getSelection()
        ?.removeAllRanges();

      setEditorSelectionActive(
        false
      );
    };

  const resetEditorHistory =
    () => {
      const snapshot =
        getEditorSnapshot();

      editorHistoryRef.current =
        snapshot
          ? [snapshot]
          : [];

      editorHistoryIndexRef.current =
        snapshot
          ? 0
          : -1;
    };

  const pushEditorHistory =
    () => {
      if (
        editorRestoringHistoryRef.current
      ) {
        return;
      }

      const snapshot =
        getEditorSnapshot();

      if (!snapshot) {
        return;
      }

      const history =
        editorHistoryRef.current;

      const currentIndex =
        editorHistoryIndexRef.current;

      if (
        history[currentIndex] ===
        snapshot
      ) {
        return;
      }

      const nextHistory =
        history.slice(
          0,
          currentIndex + 1
        );

      nextHistory.push(
        snapshot
      );

      /*
       * Keep the editor responsive even after
       * many typing/formatting operations.
       */
      if (
        nextHistory.length >
        80
      ) {
        nextHistory.shift();
      }

      editorHistoryRef.current =
        nextHistory;

      editorHistoryIndexRef.current =
        nextHistory.length - 1;
    };

  const undoEditorChange =
    () => {
      if (!isEditingText) {
        return;
      }

      const nextIndex =
        editorHistoryIndexRef.current -
        1;

      if (nextIndex < 0) {
        return;
      }

      editorHistoryIndexRef.current =
        nextIndex;

      restoreEditorSnapshot(
        editorHistoryRef.current[
          nextIndex
        ]
      );
    };

  const redoEditorChange =
    () => {
      if (!isEditingText) {
        return;
      }

      const nextIndex =
        editorHistoryIndexRef.current +
        1;

      if (
        nextIndex >=
        editorHistoryRef.current.length
      ) {
        return;
      }

      editorHistoryIndexRef.current =
        nextIndex;

      restoreEditorSnapshot(
        editorHistoryRef.current[
          nextIndex
        ]
      );
    };

  const getSelectedTextNodes = (
    range: Range
  ) => {
    const root =
      previewContainerRef.current;

    if (!root) {
      return [];
    }

    const nodes: Text[] = [];

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (
            node
          ) => {
            if (
              !node.textContent?.trim()
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            try {
              return range.intersectsNode(
                node
              )
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
            } catch {
              return NodeFilter.FILTER_REJECT;
            }
          },
        }
      );

    let current =
      walker.nextNode();

    while (current) {
      nodes.push(
        current as Text
      );
      current =
        walker.nextNode();
    }

    return nodes;
  };

  const getOriginalLineHeightPx = (
    element: HTMLElement
  ) => {
    const computed =
      window.getComputedStyle(
        element
      );

    if (
      computed.lineHeight !==
        "normal" &&
      computed.lineHeight !==
        "auto"
    ) {
      return computed.lineHeight;
    }

    /*
     * "normal" does not expose a pixel value through
     * getComputedStyle(). Measure a hidden two-line clone
     * using the paragraph's original font metrics.
     */
    const probe =
      document.createElement(
        "div"
      );

    probe.style.position =
      "fixed";
    probe.style.left =
      "-10000px";
    probe.style.top =
      "0";
    probe.style.visibility =
      "hidden";
    probe.style.pointerEvents =
      "none";
    probe.style.whiteSpace =
      "pre";
    probe.style.width =
      "1000px";
    probe.style.margin =
      "0";
    probe.style.padding =
      "0";
    probe.style.border =
      "0";
    probe.style.fontFamily =
      computed.fontFamily;
    probe.style.fontSize =
      computed.fontSize;
    probe.style.fontWeight =
      computed.fontWeight;
    probe.style.fontStyle =
      computed.fontStyle;
    probe.style.fontVariant =
      computed.fontVariant;
    probe.style.letterSpacing =
      computed.letterSpacing;
    probe.style.wordSpacing =
      computed.wordSpacing;
    probe.style.textTransform =
      computed.textTransform;
    probe.style.lineHeight =
      "normal";
    probe.textContent =
      "Ag\\nAg";

    document.body.appendChild(
      probe
    );

    const measuredHeight =
      probe.getBoundingClientRect()
        .height;

    probe.remove();

    if (
      Number.isFinite(
        measuredHeight
      ) &&
      measuredHeight > 0
    ) {
      return `${measuredHeight / 2}px`;
    }

    /*
     * Last-resort fallback for browsers that cannot
     * measure the temporary probe.
     */
    const fontSize =
      parseFloat(
        computed.fontSize
      );

    return Number.isFinite(
      fontSize
    )
      ? `${fontSize * 1.2}px`
      : "normal";
  };

  const applyEditorFontSize = (
    size: string
  ) => {
    if (!isEditingText) {
      return;
    }

    const selection =
      window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed ||
      !selection.toString().trim()
    ) {
      return;
    }

    const range =
      selection.getRangeAt(0);

    const root =
      previewContainerRef.current;

    if (!root) {
      return;
    }

    /*
     * If the selected text already belongs to a MakeUdoc
     * font-size span, update that SAME span instead of
     * creating another nested span.
     *
     * This is the key fix for:
     * 14 -> 24 -> 32 -> Reset
     *
     * Previously each change could create another wrapper,
     * making Reset behave like "one step back".
     */
    const existingSpans =
      Array.from(
        root.querySelectorAll<HTMLElement>(
          '[data-makeudoc-font-size="true"]'
        )
      ).filter(
        (span) => {
          try {
            return range.intersectsNode(
              span
            );
          } catch {
            return false;
          }
        }
      );

    if (existingSpans.length) {
      const uniqueTopLevel =
        existingSpans.filter(
          (span) => {
            const parentEdited =
              span.parentElement?.closest<HTMLElement>(
                '[data-makeudoc-font-size="true"]'
              );

            return !parentEdited;
          }
        );

      /*
       * When the selection is inside an existing edited word,
       * modify the existing wrapper. Do not nest another one.
       */
      uniqueTopLevel.forEach(
        (span) => {
          span.style.fontSize =
            size;

          const originalLineHeight =
            span.dataset
              .makeudocLineHeight;

          if (
            originalLineHeight &&
            originalLineHeight !==
              "normal" &&
            originalLineHeight !==
              "auto"
          ) {
            span.style.lineHeight =
              originalLineHeight;
          }
        }
      );

      setEditorFontSize(
        size
      );

      pushEditorHistory();

      setEditorSelectionActive(
        true
      );

      return;
    }

    const textNodes =
      getSelectedTextNodes(
        range
      );

    if (!textNodes.length) {
      return;
    }

    textNodes.forEach(
      (textNode) => {
        const fullText =
          textNode.textContent ||
          "";

        let startOffset = 0;
        let endOffset =
          fullText.length;

        if (
          textNode ===
          range.startContainer
        ) {
          startOffset =
            range.startOffset;
        }

        if (
          textNode ===
          range.endContainer
        ) {
          endOffset =
            range.endOffset;
        }

        startOffset =
          Math.max(
            0,
            Math.min(
              startOffset,
              fullText.length
            )
          );

        endOffset =
          Math.max(
            startOffset,
            Math.min(
              endOffset,
              fullText.length
            )
          );

        const before =
          fullText.slice(
            0,
            startOffset
          );

        const selected =
          fullText.slice(
            startOffset,
            endOffset
          );

        const after =
          fullText.slice(
            endOffset
          );

        const fragment =
          document.createDocumentFragment();

        if (before) {
          fragment.appendChild(
            document.createTextNode(
              before
            )
          );
        }

        if (selected) {
          const span =
            document.createElement(
              "span"
            );

          span.dataset.makeudocFontSize =
            "true";

          /*
           * Store the ORIGINAL formatting once.
           * Every later size change keeps these values.
           */
          const parentElement =
            textNode.parentElement;

          if (parentElement) {
            const computed =
              window.getComputedStyle(
                parentElement
              );

            span.dataset
              .makeudocOriginalFontSize =
              computed.fontSize;

            const originalLineHeight =
              getOriginalLineHeightPx(
                parentElement
              );

            span.dataset
              .makeudocLineHeight =
              originalLineHeight;

            if (
              originalLineHeight !==
                "normal" &&
              originalLineHeight !==
                "auto"
            ) {
              span.style.lineHeight =
                originalLineHeight;
            }
          }

          span.style.fontSize =
            size;

          span.textContent =
            selected;

          fragment.appendChild(
            span
          );
        }

        if (after) {
          fragment.appendChild(
            document.createTextNode(
              after
            )
          );
        }

        textNode.parentNode?.replaceChild(
          fragment,
          textNode
        );
      }
    );

    setEditorFontSize(
      size
    );

    pushEditorHistory();

    setEditorSelectionActive(
      true
    );
  };

  const resetSelectedTextFormatting =
    () => {
      if (!isEditingText) {
        return;
      }

      const selection =
        window.getSelection();

      const root =
        previewContainerRef.current;

      if (!selection || !root) {
        return;
      }

      let targetSpans: HTMLElement[] =
        [];

      if (
        selection.rangeCount > 0 &&
        !selection.isCollapsed &&
        selection.toString().trim()
      ) {
        const range =
          selection.getRangeAt(0);

        targetSpans =
          Array.from(
            root.querySelectorAll<HTMLElement>(
              '[data-makeudoc-font-size="true"]'
            )
          ).filter(
            (span) => {
              try {
                return range.intersectsNode(
                  span
                );
              } catch {
                return false;
              }
            }
          );
      } else {
        /*
         * No selection: use the edited span containing the caret.
         */
        let node: Node | null =
          selection.anchorNode;

        if (
          node &&
          node.nodeType !==
            Node.ELEMENT_NODE
        ) {
          node =
            node.parentElement;
        }

        const element =
          node instanceof HTMLElement
            ? node
            : null;

        const editedSpan =
          element?.closest<HTMLElement>(
            '[data-makeudoc-font-size="true"]'
          );

        if (editedSpan) {
          targetSpans = [
            editedSpan,
          ];
        }
      }

      if (!targetSpans.length) {
        return;
      }

      /*
       * Collapse nested MakeUdoc wrappers first.
       * This guarantees Reset always means:
       *
       *       "go back to the ORIGINAL DOCX state"
       *
       * rather than "undo the most recent font-size change".
       */
      const topLevelSpans =
        targetSpans.filter(
          (span) =>
            !span.parentElement?.closest<HTMLElement>(
              '[data-makeudoc-font-size="true"]'
            )
        );

      const spansToReset =
        topLevelSpans.length
          ? topLevelSpans
          : targetSpans;

      spansToReset.forEach(
        (outerSpan) => {
          /*
           * Remove all nested MakeUdoc spans while preserving
           * their text content.
           */
          Array.from(
            outerSpan.querySelectorAll<HTMLElement>(
              '[data-makeudoc-font-size="true"]'
            )
          )
            .reverse()
            .forEach(
              (nested) => {
                const parent =
                  nested.parentNode;

                if (!parent) {
                  return;
                }

                while (
                  nested.firstChild
                ) {
                  parent.insertBefore(
                    nested.firstChild,
                    nested
                  );
                }

                parent.removeChild(
                  nested
                );
              }
            );

          const originalFontSize =
            outerSpan.dataset
              .makeudocOriginalFontSize;

          const parent =
            outerSpan.parentNode;

          if (!parent) {
            return;
          }

          /*
           * If we stored the original explicit size,
           * restore it on the text node's wrapper before
           * unwrapping. Normally the parent already has it,
           * so the final unwrap returns to the DOCX style.
           */
          if (
            originalFontSize &&
            outerSpan.parentElement
          ) {
            outerSpan.dataset
              .makeudocRestored =
              "true";
          }

          while (
            outerSpan.firstChild
          ) {
            parent.insertBefore(
              outerSpan.firstChild,
              outerSpan
            );
          }

          parent.removeChild(
            outerSpan
          );
        }
      );

      root
        .querySelectorAll<HTMLElement>(
          '[data-makeudoc-font-size="true"]:empty'
        )
        .forEach(
          (span) =>
            span.remove()
        );

      detectEditorFontSize();

      pushEditorHistory();

      setEditorSelectionActive(
        Boolean(
          selection &&
            !selection.isCollapsed &&
            selection.toString().trim()
        )
      );
    };

  const runEditorCommand = (
    command:
      | "bold"
      | "italic"
      | "underline"
      | "justifyLeft"
      | "justifyCenter"
      | "justifyRight"
      | "justifyFull"
  ) => {
    if (!isEditingText) {
      return;
    }

    document.execCommand(
      command,
      false
    );

    pushEditorHistory();

    setEditorSelectionActive(
      true
    );
  };

  const detectEditorFontSize = () => {
    if (!isEditingText) {
      return;
    }

    const selection =
      window.getSelection();

    if (
      !selection ||
      selection.rangeCount === 0
    ) {
      return;
    }

    const range =
      selection.getRangeAt(0);

    let node: Node | null =
      range.startContainer;

    if (
      node.nodeType !== Node.ELEMENT_NODE
    ) {
      node = node.parentElement;
    }

    const element =
      node instanceof HTMLElement
        ? node
        : null;

    if (!element) {
      return;
    }

    const computedSize =
      window.getComputedStyle(
        element
      ).fontSize;

    if (computedSize) {
      setEditorFontSize(
        computedSize
      );
    }
  };

  const handleEditorSelection = () => {
    if (!isEditingText) {
      return;
    }

    const selection =
      window.getSelection();

    setEditorSelectionActive(
      Boolean(
        selection &&
          !selection.isCollapsed &&
          selection.toString().trim()
      )
    );

    detectEditorFontSize();
  };

  /* =====================================================
     TEXT EDIT MODE
  ===================================================== */

  useEffect(() => {
    const container =
      previewContainerRef.current;

    if (!container) {
      return;
    }

    const editablePages =
      Array.from(
        container.querySelectorAll<HTMLElement>(
          "section"
        )
      );

    editablePages.forEach(
      (page) => {
        page.contentEditable =
          isEditingText
            ? "true"
            : "false";

        page.spellcheck =
          isEditingText;

        page.setAttribute(
          "data-makeudoc-editable",
          isEditingText
            ? "true"
            : "false"
        );
      }
    );

    const handleEditorInput =
      () => {
        if (
          isEditingText &&
          !editorRestoringHistoryRef.current
        ) {
          pushEditorHistory();
        }
      };

    if (isEditingText) {
      document.addEventListener(
        "selectionchange",
        handleEditorSelection
      );

      requestAnimationFrame(() => {
        detectEditorFontSize();
      });

      editablePages.forEach(
        (page) => {
          page.addEventListener(
            "input",
            handleEditorInput
          );
        }
      );

      /*
       * The current rendered DOCX becomes
       * history state 0 when editing starts.
       */
      resetEditorHistory();
    }

    return () => {
      document.removeEventListener(
        "selectionchange",
        handleEditorSelection
      );
      editablePages.forEach(
        (page) => {
          page.removeEventListener(
            "input",
            handleEditorInput
          );

          page.contentEditable =
            "false";

          page.removeAttribute(
            "data-makeudoc-editable"
          );
        }
      );
    };
  }, [
    isEditingText,
    isRendering,
    selectedFile,
  ]);

  /* =====================================================
     DOCX → PDF
  ===================================================== */

  const convertToPdf = async () => {
    if (
      !selectedFile ||
      !previewContainerRef.current
    ) {
      return;
    }

    try {
      setIsConverting(true);
      setRenderError("");
      setIsEditingText(false);
      setEditorSelectionActive(false);
      setEditorFontSize("16px");

      const html2canvas =
        (
          await import(
            "html2canvas"
          )
        ).default;

      const container =
        previewContainerRef.current;

      /*
       * ============================================================
       * WORD PAGE DISCOVERY — V20
       * ============================================================
       *
       * The latest PDF screenshot proves the previous detector was
       * selecting ONE tall DOM node that contains BOTH Word pages.
       *
       * Result:
       *
       *     Word page 1
       *     Word page 2
       *          ↓
       *     one html2canvas capture
       *          ↓
       *     ONE PDF page containing two Word pages
       *
       * We must capture the actual page sections produced by
       * docx-preview, not the outer document node.
       *
       * docx-preview uses `.docx-wrapper` when `inWrapper: true`.
       * The direct `<section>` children are the rendered Word pages.
       * See the library API/documentation: `inWrapper` enables the
       * wrapper and `breakPages` enables page breaking.
       */

      const getElementRect =
        (element: HTMLElement) =>
          element.getBoundingClientRect();

      const isVisible =
        (element: HTMLElement) => {
          const rect =
            getElementRect(element);

          const computed =
            window.getComputedStyle(
              element
            );

          return (
            rect.width > 200 &&
            rect.height > 200 &&
            computed.display !== "none" &&
            computed.visibility !==
              "hidden"
          );
        };

      /*
       * First locate the actual docx-preview wrapper.
       * The wrapper class itself remains `docx-wrapper`; the
       * configured `className` is used by docx-preview for its
       * document/style classes.
       */
      const wrapper =
        container.querySelector<HTMLElement>(
          ".docx-wrapper"
        ) ??
        container.querySelector<HTMLElement>(
          ".docx-preview-wrapper"
        ) ??
        container.querySelector<HTMLElement>(
          '[class$="-wrapper"]'
        );

      /*
       * The correct page nodes are DIRECT children of the wrapper.
       * Do not use querySelectorAll("section") first, because that
       * can accidentally select a document/content section rather
       * than the individual Word pages.
       */
      let pages: HTMLElement[] =
        wrapper
          ? Array.from(
              wrapper.children
            ).filter(
              (element) =>
                element.tagName.toLowerCase() ===
                  "section" &&
                isVisible(
                  element as HTMLElement
                )
            ).map(
              (element) =>
                element as HTMLElement
            )
          : [];

      /*
       * Some docx-preview builds put the page sections directly in
       * the supplied container. Support that structure too.
       */
      if (
        pages.length === 0
      ) {
        pages =
          Array.from(
            container.children
          ).filter(
            (element) =>
              element.tagName.toLowerCase() ===
                "section" &&
              isVisible(
                element as HTMLElement
              )
          ).map(
            (element) =>
              element as HTMLElement
          );
      }

      /*
       * Last structural fallback for versions/configurations where
       * the wrapper is not exposed with the expected class.
       */
      if (
        pages.length === 0
      ) {
        const sections =
          Array.from(
            container.querySelectorAll<HTMLElement>(
              "section"
            )
          ).filter(
            isVisible
          );

        /*
         * Keep only sections that are not descendants of another
         * candidate section.
         */
        pages =
          sections.filter(
            (element) =>
              !sections.some(
                (parent) =>
                  parent !== element &&
                  parent.contains(
                    element
                  )
              )
          );
      }

      /*
       * IMPORTANT SAFETY CHECK
       *
       * If the detector still finds ONE giant section that is roughly
       * two A4 pages tall, do not capture it as one PDF page.
       *
       * Search its direct descendants for page-sized sections.
       * This handles the exact failure visible in the latest
       * screenshot without changing the editor or PDF sizing logic.
       */
      const A4_CSS_HEIGHT_PX =
        (11.6929133858 * 96);

      const A4_TALL_PAGE_THRESHOLD =
        A4_CSS_HEIGHT_PX * 1.35;

      if (
        pages.length === 1
      ) {
        const onlyPage =
          pages[0];

        const rect =
          getElementRect(
            onlyPage
          );

        if (
          rect.height >
          A4_TALL_PAGE_THRESHOLD
        ) {
          const descendants =
            Array.from(
              onlyPage.querySelectorAll<HTMLElement>(
                "section, div"
              )
            ).filter(
              (element) => {
                if (
                  !isVisible(element)
                ) {
                  return false;
                }

                const childRect =
                  getElementRect(
                    element
                  );

                /*
                 * A real rendered Word page should be close to
                 * A4's physical height. Allow a generous tolerance
                 * for browser DPI/zoom and document page settings.
                 */
                const heightRatio =
                  childRect.height /
                  A4_CSS_HEIGHT_PX;

                return (
                  heightRatio >
                    0.75 &&
                  heightRatio <
                    1.25 &&
                  childRect.width >
                    rect.width * 0.75
                );
              }
            );

          /*
           * Prefer the largest structural page-sized candidates,
           * but remove nested duplicates.
           */
          const pageSized =
            descendants
              .filter(
                (element) =>
                  !descendants.some(
                    (parent) =>
                      parent !==
                        element &&
                      parent.contains(
                        element
                      )
                  )
              )
              .sort(
                (a, b) =>
                  getElementRect(
                    a
                  ).top -
                  getElementRect(
                    b
                  ).top
              );

          if (
            pageSized.length >= 2
          ) {
            pages =
              pageSized;
          }
        }
      }

      /*
       * Final validation.
       */
      if (
        pages.length === 0
      ) {
        console.error(
          "MakeUdoc: unable to identify docx-preview Word page sections.",
          {
            wrapper:
              wrapper?.className ??
              null,
            containerChildren:
              Array.from(
                container.children
              ).map(
                (element) => ({
                  tag:
                    element.tagName,
                  className:
                    typeof element.className ===
                    "string"
                      ? element.className
                      : "",
                  childCount:
                    element.children
                      .length,
                  height:
                    (
                      element as HTMLElement
                    ).getBoundingClientRect()
                      .height,
                })
              ),
          }
        );

        throw new Error(
          "No rendered Word pages were found."
        );
      }

      /*
       * Allow fonts/layout to settle before measuring the page
       * sections. This is intentionally done AFTER page discovery,
       * not instead of page discovery.
       */
      await new Promise<void>(
        (resolve) =>
          requestAnimationFrame(
            () =>
              requestAnimationFrame(
                () => resolve()
              )
          )
      );


      const pdf =
        await PDFDocument.create();

      /*
       * ================================================================
       * PDF PAGINATION — V18
       * ================================================================
       *
       * Source of truth:
       *   the LIVE docx-preview page currently visible in the editor.
       *
       * Important:
       *   1. A normal docx-preview <section> is treated as one Word page.
       *   2. We never arbitrarily resize font/text/line-height.
       *   3. We only paginate a section when its rendered content is
       *      actually taller than one A4 page.
       *   4. When pagination is necessary, breaks are chosen from DOM
       *      block boundaries, not arbitrary pixel rows.
       *
       * This removes the old failure mode where a tiny last canvas slice
       * became a separate PDF page and where table/text boxes were cut.
       */

      const A4_WIDTH_PT =
        595.28;

      const A4_HEIGHT_PT =
        841.89;

      const renderScale = 4;

      const A4_WIDTH_PX =
        Math.ceil(
          (A4_WIDTH_PT / 72) *
            96 *
            renderScale
        );

      const A4_HEIGHT_PX =
        Math.ceil(
          (A4_HEIGHT_PT / 72) *
            96 *
            renderScale
        );

      const captureEditableState =
        (
          page: HTMLElement
        ) => {
          return Array.from(
            page.querySelectorAll<HTMLElement>(
              '[contenteditable="true"]'
            )
          ).map(
            (element) => ({
              element,
              value:
                element.getAttribute(
                  "contenteditable"
                ),
            })
          );
        };

      const restoreEditableState =
        (
          elements: ReturnType<
            typeof captureEditableState
          >
        ) => {
          elements.forEach(
            ({
              element,
              value,
            }) => {
              if (value === null) {
                element.removeAttribute(
                  "contenteditable"
                );
              } else {
                element.setAttribute(
                  "contenteditable",
                  value
                );
              }
            }
          );
        };

      const createA4PdfPageFromCanvas =
        async (
          sourceCanvas: HTMLCanvasElement,
          sourceY: number,
          sourceHeight: number
        ) => {
          if (
            sourceHeight <= 1
          ) {
            return;
          }

          /*
           * ============================================================
           * PDF PAGE SIZING FIX
           * ============================================================
           *
           * The previous implementation first created a full A4 canvas
           * and then fitted the captured Word page into that canvas.
           * That introduced an additional scale/centering step and could
           * make the Word document appear much smaller than the original.
           *
           * Instead, preserve the captured Word page's natural aspect
           * ratio. The width remains the normal A4 width, while the
           * height is calculated from the actual captured page ratio.
           *
           * For a normal A4 Word page this still produces a standard
           * 595.28 x 841.89 pt A4 PDF page, but without the extra
           * fit-and-center operation.
           */
          const pdfWidthPt =
            A4_WIDTH_PT;

          const pdfHeightPt =
            Math.max(
              1,
              pdfWidthPt *
                (sourceHeight /
                  Math.max(
                    1,
                    sourceCanvas.width
                  ))
            );

          /*
           * Create a canvas containing only this page/slice.
           * No scaling is applied while copying the source pixels.
           */
          const outputCanvas =
            document.createElement(
              "canvas"
            );

          outputCanvas.width =
            sourceCanvas.width;

          outputCanvas.height =
            Math.ceil(sourceHeight);

          const context =
            outputCanvas.getContext(
              "2d"
            );

          if (!context) {
            throw new Error(
              "Unable to create the PDF canvas."
            );
          }

          context.fillStyle =
            "#ffffff";

          context.fillRect(
            0,
            0,
            outputCanvas.width,
            outputCanvas.height
          );

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

          const imageData =
            outputCanvas.toDataURL(
              "image/png"
            );

          const image =
            await pdf.embedPng(
              imageData
            );

          const pdfPage =
            pdf.addPage([
              pdfWidthPt,
              pdfHeightPt,
            ]);

          /*
           * Draw the captured page across the full PDF page width.
           * There is intentionally no offsetX/offsetY and no second
           * fitScale here. This is what prevents the document from
           * being unnecessarily shrunk into the middle of the page.
           */
          pdfPage.drawImage(
            image,
            {
              x: 0,
              y: 0,
              width: pdfWidthPt,
              height: pdfHeightPt,
            }
          );
        };

      for (
        let index = 0;
        index < pages.length;
        index++
      ) {
        const page =
          pages[index];

        const originalRect =
          page.getBoundingClientRect();

        if (
          originalRect.width <= 0 ||
          originalRect.height <= 0
        ) {
          continue;
        }

        const editableElements =
          captureEditableState(
            page
          );

        const activeElement =
          document.activeElement as
            | HTMLElement
            | null;

        window
          .getSelection()
          ?.removeAllRanges();

        editableElements.forEach(
          ({
            element,
          }) => {
            element.setAttribute(
              "contenteditable",
              "false"
            );
          }
        );

        activeElement?.blur();

        /*
         * If an edited word became larger than the original page height,
         * docx-preview can leave the overflow outside the fixed section.
         *
         * Expose that overflow ONLY for the PDF capture. We do not change
         * font size, line height, width, margins, or positioning.
         */
        const measuredScrollHeight =
          Math.max(
            page.scrollHeight,
            Math.ceil(
              originalRect.height
            )
          );

        const hasVerticalOverflow =
          measuredScrollHeight >
          Math.ceil(
            originalRect.height + 12
          );

        const originalInlineHeight =
          page.style.height;

        const originalInlineMinHeight =
          page.style.minHeight;

        const originalInlineOverflow =
          page.style.overflow;

        if (hasVerticalOverflow) {
          page.style.setProperty(
            "height",
            `${measuredScrollHeight}px`,
            "important"
          );

          page.style.setProperty(
            "min-height",
            `${measuredScrollHeight}px`,
            "important"
          );

          page.style.setProperty(
            "overflow",
            "visible",
            "important"
          );
        }

        void page.offsetHeight;

        const captureRect =
          page.getBoundingClientRect();

        const canvas =
          await html2canvas(
            page,
            {
              scale:
                renderScale,
              useCORS: true,
              allowTaint: false,
              backgroundColor:
                "#ffffff",
              logging: false,
              imageTimeout: 20000,
              scrollX: 0,
              scrollY: 0,
              windowWidth:
                document.documentElement
                  .clientWidth,
              windowHeight:
                Math.max(
                  document.documentElement
                    .clientHeight,
                  Math.ceil(
                    captureRect.height
                  )
                ),
              width:
                Math.ceil(
                  captureRect.width
                ),
              height:
                Math.ceil(
                  captureRect.height
                ),
              onclone: (
                clonedDocument
              ) => {
                clonedDocument
                  .querySelectorAll(
                    "section"
                  )
                  .forEach(
                    (element) => {
                      (
                        element as HTMLElement
                      ).style.boxShadow =
                        "none";
                    }
                  );
              },
            }
          );

        /*
         * Restore the live editor immediately after capture.
         */
        if (hasVerticalOverflow) {
          page.style.height =
            originalInlineHeight;

          page.style.minHeight =
            originalInlineMinHeight;

          page.style.overflow =
            originalInlineOverflow;
        }

        restoreEditableState(
          editableElements
        );

        /*
         * ============================================================
         * NORMAL WORD PAGE = ONE PDF PAGE
         * ============================================================
         *
         * This is the important V19 correction.
         *
         * A rendered docx-preview <section> is already a Word page.
         * Do NOT decide to split it again just because the canvas
         * height differs slightly from an A4 aspect-ratio calculation.
         *
         * That second pagination layer was what moved:
         *
         *   "Consistently met..."
         *
         * from page 1 to page 2 and then pushed the remaining
         * achievements/declaration onto a third page.
         *
         * Only the explicit DOM overflow path above is allowed to
         * create additional PDF pages.
         */
        const sourceA4Height =
          canvas.width *
          (A4_HEIGHT_PT /
            A4_WIDTH_PT);

        if (
          !hasVerticalOverflow
        ) {
          await createA4PdfPageFromCanvas(
            canvas,
            0,
            canvas.height
          );

          continue;
        }

        /*
         * ============================================================
         * SAFE PAGINATION FOR GENUINELY OVERFLOWING EDITED CONTENT
         * ============================================================
         *
         * Tables:
         *   <tr> is atomic.
         *
         * Text:
         *   paragraph/heading/list item is atomic.
         *
         * Nested elements inside those blocks are ignored, preventing
         * a boundary from being created halfway through a line.
         */
        const pageRect =
          page.getBoundingClientRect();

        const cssToCanvasScale =
          canvas.height /
          Math.max(
            1,
            pageRect.height
          );

        const atomicElements =
          Array.from(
            page.querySelectorAll<HTMLElement>(
              "tr, p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, figure"
            )
          ).filter(
            (element) => {
              /*
               * A table row owns the whole row.
               */
              if (
                element.closest("tr") &&
                element.tagName !==
                  "TR"
              ) {
                return false;
              }

              /*
               * A paragraph inside a list item does not get
               * its own page boundary.
               */
              if (
                element.closest("li") &&
                element.tagName ===
                  "P"
              ) {
                return false;
              }

              const rect =
                element.getBoundingClientRect();

              return (
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom >
                  pageRect.top &&
                rect.top <
                  pageRect.bottom
              );
            }
          );

        const safeBoundaries =
          new Set<number>([
            0,
            canvas.height,
          ]);

        atomicElements.forEach(
          (element) => {
            const rect =
              element.getBoundingClientRect();

            const top =
              Math.max(
                0,
                Math.min(
                  canvas.height,
                  Math.round(
                    (rect.top -
                      pageRect.top) *
                      cssToCanvasScale
                  )
                )
              );

            const bottom =
              Math.max(
                0,
                Math.min(
                  canvas.height,
                  Math.round(
                    (rect.bottom -
                      pageRect.top) *
                      cssToCanvasScale
                  )
                )
              );

            safeBoundaries.add(
              top
            );

            safeBoundaries.add(
              bottom
            );
          }
        );

        const sortedBoundaries =
          Array.from(
            safeBoundaries
          ).sort(
            (a, b) => a - b
          );

        const sourceBreaks =
          [0];

        let currentSourceY =
          0;

        /*
         * Do not create a tiny page containing only a few pixels/lines.
         */
        const minimumUsefulSlice =
          sourceA4Height * 0.35;

        while (
          currentSourceY <
          canvas.height - 1
        ) {
          const desiredEnd =
            Math.min(
              canvas.height,
              currentSourceY +
                sourceA4Height
            );

          if (
            desiredEnd >=
            canvas.height - 1
          ) {
            sourceBreaks.push(
              canvas.height
            );
            break;
          }

          const candidates =
            sortedBoundaries.filter(
              (boundary) =>
                boundary >
                  currentSourceY +
                    8 &&
                boundary <=
                  desiredEnd
            );

          let chosenBreak =
            candidates.length
              ? candidates[
                  candidates.length -
                    1
                ]
              : desiredEnd;

          /*
           * Never intentionally make a page smaller than ~35% of A4
           * when a previous safe boundary exists.
           */
          if (
            chosenBreak -
              currentSourceY <
            minimumUsefulSlice
          ) {
            const usefulCandidates =
              candidates.filter(
                (boundary) =>
                  boundary -
                    currentSourceY >=
                  minimumUsefulSlice
              );

            if (
              usefulCandidates.length
            ) {
              chosenBreak =
                usefulCandidates[
                  usefulCandidates.length -
                    1
                ];
            }
          }

          if (
            chosenBreak <=
            currentSourceY
          ) {
            chosenBreak =
              desiredEnd;
          }

          sourceBreaks.push(
            chosenBreak
          );

          currentSourceY =
            chosenBreak;
        }

        /*
         * Remove accidental duplicate break positions.
         */
        const uniqueBreaks =
          sourceBreaks.filter(
            (value, breakIndex) =>
              breakIndex === 0 ||
              value >
                sourceBreaks[
                  breakIndex - 1
                ] + 1
          );

        /*
         * If the final remainder is tiny, merge it into the previous
         * slice instead of producing a mostly blank extra PDF page.
         *
         * We intentionally allow the previous slice to be slightly
         * taller than the normal A4 source height in this rare case;
         * createA4PdfPageFromCanvas will scale it proportionally.
         */
        if (
          uniqueBreaks.length >=
          3
        ) {
          const lastStart =
            uniqueBreaks[
              uniqueBreaks.length - 2
            ];

          const lastSize =
            canvas.height -
            lastStart;

          if (
            lastSize <
            sourceA4Height * 0.12
          ) {
            uniqueBreaks.splice(
              uniqueBreaks.length - 2,
              1
            );
          }
        }

        for (
          let breakIndex = 0;
          breakIndex <
          uniqueBreaks.length - 1;
          breakIndex++
        ) {
          const sourceY =
            uniqueBreaks[
              breakIndex
            ];

          const sourceEnd =
            uniqueBreaks[
              breakIndex + 1
            ];

          const sourceHeight =
            sourceEnd -
            sourceY;

          if (
            sourceHeight <= 1
          ) {
            continue;
          }

          await createA4PdfPageFromCanvas(
            canvas,
            sourceY,
            sourceHeight
          );
        }
      }

      const pdfBytes =
        await pdf.save();

      /*
       * Keep TypeScript happy with the current
       * ArrayBuffer / BlobPart definitions.
       */
      const pdfBuffer =
        new ArrayBuffer(
          pdfBytes.byteLength
        );

      new Uint8Array(
        pdfBuffer
      ).set(pdfBytes);

      const blob =
        new Blob(
          [pdfBuffer],
          {
            type:
              "application/pdf",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const originalName =
        selectedFile.name.replace(
          /\.docx$/i,
          ""
        );

      setPdfResult({
        url,
        fileName:
          `${originalName}.pdf`,
      });

      setPdfFileName(
        originalName
      );
    } catch (error) {
      console.error(
        "DOCX to PDF conversion failed:",
        error
      );

      setRenderError(
        "Unable to convert this Word document to PDF. Please try again with another document."
      );
    } finally {
      setIsConverting(false);
    }
  };

  /* =====================================================
     PDF FILENAME
  ===================================================== */

  const sanitizePdfFileName = (
    value: string
  ) => {
    return value
      .replace(/\\/g, "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.pdf$/i, "");
  };

  const getPdfFileName = () => {
    const cleaned =
      sanitizePdfFileName(
        pdfFileName
      );

    if (!cleaned) {
      return "MakeUdoc-Document.pdf";
    }

    return `${cleaned}.pdf`;
  };

  /* =====================================================
     DOWNLOAD PDF
  ===================================================== */

  const downloadPdf = () => {
    if (!pdfResult) {
      return;
    }

    const link =
      document.createElement(
        "a"
      );

    link.href =
      pdfResult.url;

    link.download =
      getPdfFileName();

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();
  };

  /* =====================================================
     CLEAN PDF URL
  ===================================================== */

  useEffect(() => {
    return () => {
      if (pdfResult) {
        URL.revokeObjectURL(
          pdfResult.url
        );
      }
    };
  }, [pdfResult]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:py-12">

      <div className="mx-auto max-w-5xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="text-center">

          <div className="mb-3 text-4xl">
            📄
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Word to PDF
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Convert your Word document
            into a submission-ready PDF.
          </p>

        </div>

        {/* =================================================
            UPLOAD CARD
        ================================================= */}

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => {
              setIsDragging(false);
            }}
            onDrop={
              handleDrop
            }
            onClick={() =>
              fileInputRef.current?.click()
            }
            className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-zinc-300 bg-zinc-50 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
          >

            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
              📄
            </div>

            <h2 className="text-lg font-bold text-zinc-900">
              {isDragging
                ? "Drop your Word document here"
                : "Upload a Word document"}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Drag and drop your .docx file
              here, or tap to choose one
              from your device.
            </p>

            <span className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
              Choose Word File
            </span>

            <p className="mt-4 text-xs text-zinc-400">
              Supported format: .docx
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={
                handleFileChange
              }
              className="hidden"
            />

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* =================================================
              SELECTED FILE
          ================================================= */}

          {selectedFile && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xl">
                  📄
                </div>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {formatFileSize(
                      selectedFile.size
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={(
                    event
                  ) => {
                    event.stopPropagation();
                    removeFile();
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg text-zinc-600 transition hover:bg-zinc-200"
                  aria-label="Remove file"
                >
                  ×
                </button>

              </div>

            </div>
          )}

        </div>

        {/* =================================================
            DOCUMENT PREVIEW
        ================================================= */}

        {selectedFile && (
          <section className="mt-6">

            <div className="mb-3 flex items-center justify-between">

              <div>

                <h2 className="text-lg font-bold text-zinc-900">
                  Document Preview
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Preview of your Word document
                </p>

              </div>

              <div className="flex items-center gap-2">
                {isEditingText && (
                  <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                    Editing
                  </span>
                )}

                {isRendering && (
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                    Rendering...
                  </span>
                )}
              </div>

            </div>

            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-200 shadow-sm">

              {isRendering && (
                <div className="flex min-h-[300px] items-center justify-center px-5 text-center">

                  <div>

                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="animate-pulse text-2xl">
                        📄
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-zinc-700">
                      Preparing document preview...
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Please wait.
                    </p>

                  </div>

                </div>
              )}

              {renderError && (
                <div className="flex min-h-[250px] items-center justify-center px-5">

                  <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

                    <div className="text-3xl">
                      ⚠️
                    </div>

                    <p className="mt-3 text-sm font-semibold text-red-800">
                      Conversion unavailable
                    </p>

                    <p className="mt-2 text-xs leading-5 text-red-700">
                      {renderError}
                    </p>

                  </div>

                </div>
              )}

              <div
                ref={
                  previewContainerRef
                }
                className="word-preview-container max-h-[70vh] overflow-auto p-3 sm:p-6"
              />

            </div>

          </section>
        )}

        {/* =================================================
            TEXT EDIT CONTROLS
        ================================================= */}

        {selectedFile &&
          !isRendering &&
          !renderError &&
          !pdfResult && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">

              <div className="flex flex-col gap-4">

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-900">
                      {isEditingText
                        ? "Text editing is ON"
                        : "Want to edit the document?"}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      {isEditingText
                        ? "Click the text in the preview to edit it. Select text first if you want to format it."
                        : "Turn on editing to change visible text before converting the document to PDF."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingText(
                        (current) =>
                          !current
                      );
                      setEditorSelectionActive(
                        false
                      );
                    }}
                    className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                      isEditingText
                        ? "border border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                        : "bg-amber-600 text-white hover:bg-amber-700"
                    }`}
                  >
                    {isEditingText
                      ? "✓ Done Editing"
                      : "✏️ Edit Text"}
                  </button>

                </div>

                {isEditingText && (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2 shadow-sm">
                    <div className="flex flex-wrap items-center gap-1.5">

                      {/* FONT */}
                      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                        <span className="hidden px-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400 sm:inline">
                          Font
                        </span>

                        <select
                          value={editorFontSize}
                          onChange={(event) =>
                            applyEditorFontSize(
                              event.target.value
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="h-9 w-[76px] rounded-lg border-0 bg-zinc-50 px-2 text-xs font-bold text-zinc-800 outline-none transition hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Font size"
                          title="Font size"
                        >
                          {![
                            "8px",
                            "9px",
                            "10px",
                            "11px",
                            "12px",
                            "14px",
                            "16px",
                            "18px",
                            "20px",
                            "24px",
                            "28px",
                            "32px",
                            "36px",
                            "48px",
                            "72px",
                          ].includes(
                            editorFontSize
                          ) && (
                            <option value={editorFontSize}>
                              {editorFontSize.replace(
                                "px",
                                ""
                              )}
                            </option>
                          )}
                          <option value="8px">8</option>
                          <option value="9px">9</option>
                          <option value="10px">10</option>
                          <option value="11px">11</option>
                          <option value="12px">12</option>
                          <option value="14px">14</option>
                          <option value="16px">16</option>
                          <option value="18px">18</option>
                          <option value="20px">20</option>
                          <option value="24px">24</option>
                          <option value="28px">28</option>
                          <option value="32px">32</option>
                          <option value="36px">36</option>
                          <option value="48px">48</option>
                          <option value="72px">72</option>
                        </select>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={
                            resetSelectedTextFormatting
                          }
                          disabled={
                            !isEditingText
                          }
                          className="h-9 rounded-lg px-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Reset selected text formatting"
                          aria-label="Reset selected text formatting"
                        >
                          ↺
                          <span className="ml-1 hidden sm:inline">
                            Reset
                          </span>
                        </button>
                      </div>

                      {/* TEXT STYLE */}
                      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "bold"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold text-zinc-800 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Bold"
                          aria-label="Bold"
                        >
                          B
                        </button>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "italic"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold italic text-zinc-800 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Italic"
                          aria-label="Italic"
                        >
                          I
                        </button>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "underline"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-zinc-800 underline decoration-2 underline-offset-2 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Underline"
                          aria-label="Underline"
                        >
                          U
                        </button>
                      </div>

                      {/* ALIGNMENT */}
                      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "justifyLeft"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Align left"
                          aria-label="Align left"
                        >
                          ☰
                        </button>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "justifyCenter"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Align center"
                          aria-label="Align center"
                        >
                          ≡
                        </button>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "justifyRight"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Align right"
                          aria-label="Align right"
                        >
                          ≡
                        </button>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={() =>
                            runEditorCommand(
                              "justifyFull"
                            )
                          }
                          disabled={
                            !editorSelectionActive
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-35"
                          title="Justify"
                          aria-label="Justify"
                        >
                          ☰
                        </button>
                      </div>

                      {/* HISTORY */}
                      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={
                            undoEditorChange
                          }
                          className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-700"
                          title="Undo"
                          aria-label="Undo"
                        >
                          <span className="text-base leading-none">
                            ↶
                          </span>
                          <span className="hidden sm:inline">
                            Undo
                          </span>
                        </button>

                        <button
                          type="button"
                          onMouseDown={(event) =>
                            event.preventDefault()
                          }
                          onClick={
                            redoEditorChange
                          }
                          className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 hover:text-blue-700"
                          title="Redo"
                          aria-label="Redo"
                        >
                          <span className="text-base leading-none">
                            ↷
                          </span>
                          <span className="hidden sm:inline">
                            Redo
                          </span>
                        </button>
                      </div>

                      {/* STATUS */}
                      <span className="ml-auto hidden rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] font-semibold text-blue-700 sm:inline-flex">
                        {editorSelectionActive
                          ? "Text selected"
                          : "Select text to format"}
                      </span>

                    </div>

                    <div className="mt-2 flex items-center justify-between px-1 sm:hidden">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        Formatting toolbar
                      </span>

                      <span className="text-[10px] font-medium text-zinc-500">
                        {editorSelectionActive
                          ? "Selection active"
                          : "Select text"}
                      </span>
                    </div>
                  </div>
                )}

              </div>

            </div>
        )}

        {/* =================================================
            CONVERT BUTTON
        ================================================= */}

        {selectedFile &&
          !isRendering &&
          !renderError &&
          !pdfResult && (
            <div className="mt-6">

              <button
                type="button"
                onClick={
                  convertToPdf
                }
                disabled={
                  isConverting
                }
                className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConverting
                  ? "Converting to PDF..."
                  : "Convert to PDF"}
              </button>

            </div>
          )}

        {/* =================================================
            PDF RESULT
        ================================================= */}

        {pdfResult && (
          <section className="mt-6">

            <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl">
                  ✓
                </div>

                <div className="min-w-0 flex-1">

                  <h2 className="text-lg font-bold text-zinc-900">
                    PDF Ready
                  </h2>

                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {getPdfFileName()}
                  </p>

                </div>

              </div>

              {/* PDF PREVIEW */}

              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">

                <iframe
                  src={
                    pdfResult.url
                  }
                  title="PDF Preview"
                  className="h-[65vh] min-h-[450px] w-full"
                />

              </div>

              {/* RENAME PDF */}

              <div className="mt-5">

                <label
                  htmlFor="pdf-file-name"
                  className="mb-2 block text-sm font-semibold text-zinc-800"
                >
                  PDF file name
                </label>

                <div className="flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">

                  <input
                    id="pdf-file-name"
                    type="text"
                    value={pdfFileName}
                    onChange={(event) =>
                      setPdfFileName(
                        event.target.value
                      )
                    }
                    onBlur={() => {
                      setPdfFileName(
                        sanitizePdfFileName(
                          pdfFileName
                        )
                      );
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        event.preventDefault();
                        downloadPdf();
                      }
                    }}
                    placeholder="Enter PDF file name"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
                  />

                  <div className="flex items-center border-l border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-500">
                    .pdf
                  </div>

                </div>

                <p className="mt-2 text-xs text-zinc-500">
                  The .pdf extension will be added automatically.
                </p>

              </div>

              {/* ACTIONS */}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={
                    downloadPdf
                  }
                  disabled={
                    !sanitizePdfFileName(
                      pdfFileName
                    )
                  }
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ⬇️ Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      pdfResult
                    ) {
                      URL.revokeObjectURL(
                        pdfResult.url
                      );
                    }

                    setPdfResult(
                      null
                    );
                    setPdfFileName("");
                  }}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.99]"
                >
                  Edit / Convert Again
                </button>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            INFO
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          <strong>
            MakeUdoc:
          </strong>{" "}
          Your Word document is processed
          locally in the browser.
        </div>

      </div>

      {/* =================================================
          DOCX PREVIEW STYLES
      ================================================= */}

      <style jsx global>{`
        .word-preview-container {
          -webkit-overflow-scrolling: touch;
        }

        /* =================================================
           TABLE / PARAGRAPH LAYOUT FIX
           Keep DOCX tables readable when captured to canvas/PDF.
        ================================================= */

        .word-preview-container table {
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          max-width: 100% !important;
        }

        .word-preview-container table tr {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        .word-preview-container table td,
        .word-preview-container table th {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          vertical-align: top !important;
          white-space: normal !important;
          overflow: visible !important;
          overflow-wrap: break-word !important;
          word-break: normal !important;
          box-sizing: border-box !important;

          /*
           * The console measurement showed that row height is
           * exactly equal to scrollHeight (17/33/48px).
           * The cells therefore have essentially zero vertical
           * breathing room, making the horizontal border appear
           * to cut through the last text line.
           */
          padding: 6px 8px !important;
        }

        .word-preview-container table td *,
        .word-preview-container table th * {
          max-height: none !important;
          overflow: visible !important;
          white-space: normal !important;
          overflow-wrap: break-word !important;
        }

        .word-preview-container table td > *,
        .word-preview-container table th > * {
          max-width: 100% !important;
        }

        .word-preview-container table p {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }

        .word-preview-container table span,
        .word-preview-container table div {
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }

        .word-preview-container p {
          overflow-wrap: anywhere;
        }

        .word-preview-container
          [data-makeudoc-font-size="true"] {
          display: inline !important;
          vertical-align: baseline;
        }

        .word-preview-container
          [data-makeudoc-editable="true"] {
          cursor: text !important;
          caret-color: #2563eb;
          outline: 2px dashed rgba(245, 158, 11, 0.55);
          outline-offset: 4px;
        }

        .word-preview-container
          [data-makeudoc-editable="true"]
          * {
          cursor: text !important;
        }

        .word-preview-container
          [data-makeudoc-editable="true"] u {
          text-decoration-line: underline !important;
          text-decoration-style: solid !important;
          text-decoration-thickness: 1px !important;
          text-underline-offset: 2px !important;
        }

        .word-preview-container
          [data-makeudoc-editable="true"]
          span[style*="text-decoration"] {
          text-decoration-line: underline !important;
        }

        .word-preview-container
          [data-makeudoc-editable="true"]::selection {
          background: rgba(59, 130, 246, 0.25);
        }

        .word-preview-container .docx-wrapper {
          background: #e4e4e7 !important;
          padding: 20px 0 !important;
        }

        .word-preview-container
          .docx-wrapper
          > section {
          margin: 0 auto 20px auto !important;
          box-shadow:
            0 4px 16px
            rgba(0, 0, 0, 0.12) !important;
        }

        .word-preview-container
          .docx-wrapper
          > section:last-child {
          margin-bottom: 0 !important;
        }

        @media (max-width: 640px) {
          .word-preview-container {
            padding: 8px !important;
          }

          .word-preview-container
            .docx-wrapper {
            padding: 10px 0 !important;
          }

          .word-preview-container
            .docx-wrapper
            > section {
            margin-bottom: 12px !important;
          }
        }
      `}</style>

    </main>
  );
}