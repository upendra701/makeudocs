"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { PDFDocument } from "pdf-lib";
import { WordUploader } from "./components/WordUploader";
import { WordToPdfSeoContent } from "./components/WordToPdfSeoContent";
import { useWordDocument } from "./hooks/useWordDocument";
import { useDocxRenderer } from "./hooks/useDocxRenderer";
import { usePdfConverter } from "./hooks/usePdfConverter";
import type { PdfResult } from "./types";


export default function WordToPdfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const editorHistoryRef = useRef<string[]>([]);
  const editorHistoryIndexRef = useRef(-1);
  const editorRestoringHistoryRef = useRef(false);
  const previewPanRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [isRendering, setIsRendering] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editorSelectionActive, setEditorSelectionActive] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState("16px");
  const [pdfResult, setPdfResult] = useState<PdfResult | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const {
    selectedFile,
    isDragging,
    setIsDragging,
    error,
    renderError,
    setRenderError,
    handleFile,
    removeFile,
  } = useWordDocument({
    fileInputRef,
    previewContainerRef,
    pdfResult,
    setPdfResult,
    setPdfFileName,
  });

  useDocxRenderer({
    selectedFile,
    previewContainerRef,
    setIsRendering,
    setRenderError,
  });
  const convertToPdf = usePdfConverter({
    selectedFile,
    previewContainerRef,
    setIsConverting,
    setRenderError,
    setIsEditingText,
    setEditorSelectionActive,
    setEditorFontSize,
    setPdfResult,
    setPdfFileName,
  });


  /* =====================================================
     DOCUMENT PREVIEW PAN / TOUCH SUPPORT
     Mobile: finger drag pans the Word document.
     Desktop: mouse drag pans the preview outside editable text.
  ===================================================== */

  const handlePreviewPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const container = previewContainerRef.current;
    if (!container) return;

    if (event.pointerType === "mouse" && event.button !== 0) return;

    const target = event.target as HTMLElement | null;

    // Preserve normal mouse text selection/editing.
    // On touch, allow panning even when the finger starts over text.
    if (
      event.pointerType === "mouse" &&
      isEditingText &&
      target?.closest("[data-makeudoc-editable='true']")
    ) {
      return;
    }

    const state = previewPanRef.current;
    state.active = true;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.scrollLeft = container.scrollLeft;
    state.scrollTop = container.scrollTop;

    container.setPointerCapture?.(event.pointerId);
    container.classList.add("word-preview-panning");

    // The JS handler owns touch movement inside the preview.
    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }
  };

  const handlePreviewPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    const container = previewContainerRef.current;
    const state = previewPanRef.current;

    if (!container || !state.active || state.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    container.scrollLeft = state.scrollLeft - dx;
    container.scrollTop = state.scrollTop - dy;

    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }
  };

  const endPreviewPan = (
    event?: React.PointerEvent<HTMLDivElement>
  ) => {
    const container = previewContainerRef.current;
    const state = previewPanRef.current;

    if (!state.active) return;
    if (event && state.pointerId !== event.pointerId) return;

    if (
      event &&
      container?.hasPointerCapture?.(event.pointerId)
    ) {
      container.releasePointerCapture(event.pointerId);
    }

    state.active = false;
    state.pointerId = -1;
    container?.classList.remove("word-preview-panning");
  };


  /* =====================================================
     TEXT EDITING TOOLS
  ===================================================== */

  const getEditorSnapshot = () => {
    const container = previewContainerRef.current;
    if (!container) return "";
    return Array.from(container.querySelectorAll<HTMLElement>("section"))
      .map((section) => section.innerHTML)
      .join("\n<!-- MAKEUDOC_PAGE_SEPARATOR -->\n");
  };

  const restoreEditorSnapshot = (snapshot: string) => {
    const container = previewContainerRef.current;
    if (!container) return;

    const pages = Array.from(container.querySelectorAll<HTMLElement>("section"));
    const parts = snapshot.split("\n<!-- MAKEUDOC_PAGE_SEPARATOR -->\n");

    editorRestoringHistoryRef.current = true;
    pages.forEach((page, index) => {
      page.innerHTML = parts[index] ?? "";
    });
    editorRestoringHistoryRef.current = false;

    window.getSelection()?.removeAllRanges();
    setEditorSelectionActive(false);
  };

  const resetEditorHistory = () => {
    const snapshot = getEditorSnapshot();
    editorHistoryRef.current = snapshot ? [snapshot] : [];
    editorHistoryIndexRef.current = snapshot ? 0 : -1;
  };

  const pushEditorHistory = () => {
    if (editorRestoringHistoryRef.current) return;
    const snapshot = getEditorSnapshot();
    if (!snapshot) return;

    const history = editorHistoryRef.current;
    const currentIndex = editorHistoryIndexRef.current;

    if (history[currentIndex] === snapshot) return;

    const nextHistory = history.slice(0, currentIndex + 1);
    nextHistory.push(snapshot);

    if (nextHistory.length > 80) nextHistory.shift();

    editorHistoryRef.current = nextHistory;
    editorHistoryIndexRef.current = nextHistory.length - 1;
  };

  const undoEditorChange = () => {
    if (!isEditingText) return;
    const nextIndex = editorHistoryIndexRef.current - 1;
    if (nextIndex < 0) return;
    editorHistoryIndexRef.current = nextIndex;
    restoreEditorSnapshot(editorHistoryRef.current[nextIndex]);
  };

  const redoEditorChange = () => {
    if (!isEditingText) return;
    const nextIndex = editorHistoryIndexRef.current + 1;
    if (nextIndex >= editorHistoryRef.current.length) return;
    editorHistoryIndexRef.current = nextIndex;
    restoreEditorSnapshot(editorHistoryRef.current[nextIndex]);
  };

  const getSelectedTextNodes = (range: Range) => {
    const root = previewContainerRef.current;
    if (!root) return [];

    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        try {
          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      },
    });

    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }
    return nodes;
  };

  const getOriginalLineHeightPx = (element: HTMLElement) => {
    const computed = window.getComputedStyle(element);
    if (computed.lineHeight !== "normal" && computed.lineHeight !== "auto") {
      return computed.lineHeight;
    }

    const probe = document.createElement("div");
    probe.style.position = "fixed";
    probe.style.left = "-10000px";
    probe.style.top = "0";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    probe.style.whiteSpace = "pre";
    probe.style.width = "1000px";
    probe.style.margin = "0";
    probe.style.padding = "0";
    probe.style.border = "0";
    probe.style.fontFamily = computed.fontFamily;
    probe.style.fontSize = computed.fontSize;
    probe.style.fontWeight = computed.fontWeight;
    probe.style.fontStyle = computed.fontStyle;
    probe.style.fontVariant = computed.fontVariant;
    probe.style.letterSpacing = computed.letterSpacing;
    probe.style.wordSpacing = computed.wordSpacing;
    probe.style.textTransform = computed.textTransform;
    probe.style.lineHeight = "normal";
    probe.textContent = "Ag\nAg";

    document.body.appendChild(probe);
    const measuredHeight = probe.getBoundingClientRect().height;
    probe.remove();

    if (Number.isFinite(measuredHeight) && measuredHeight > 0) {
      return `${measuredHeight / 2}px`;
    }

    const fontSize = parseFloat(computed.fontSize);
    return Number.isFinite(fontSize) ? `${fontSize * 1.2}px` : "normal";
  };

  const applyEditorFontSize = (size: string) => {
    if (!isEditingText) return;

    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed ||
      !selection.toString().trim()
    ) {
      return;
    }

    const range = selection.getRangeAt(0);
    const root = previewContainerRef.current;
    if (!root) return;

    const existingSpans = Array.from(
      root.querySelectorAll<HTMLElement>('[data-makeudoc-font-size="true"]')
    ).filter((span) => {
      try {
        return range.intersectsNode(span);
      } catch {
        return false;
      }
    });

    if (existingSpans.length) {
      const uniqueTopLevel = existingSpans.filter((span) => {
        const parentEdited = span.parentElement?.closest<HTMLElement>(
          '[data-makeudoc-font-size="true"]'
        );
        return !parentEdited;
      });

      uniqueTopLevel.forEach((span) => {
        span.style.fontSize = size;
        const originalLineHeight = span.dataset.makeudocLineHeight;
        if (
          originalLineHeight &&
          originalLineHeight !== "normal" &&
          originalLineHeight !== "auto"
        ) {
          span.style.lineHeight = originalLineHeight;
        }
      });

      setEditorFontSize(size);
      pushEditorHistory();
      setEditorSelectionActive(true);
      return;
    }

    const textNodes = getSelectedTextNodes(range);
    if (!textNodes.length) return;

    textNodes.forEach((textNode) => {
      const fullText = textNode.textContent || "";
      let startOffset = 0;
      let endOffset = fullText.length;

      if (textNode === range.startContainer) {
        startOffset = range.startOffset;
      }
      if (textNode === range.endContainer) {
        endOffset = range.endOffset;
      }

      startOffset = Math.max(0, Math.min(startOffset, fullText.length));
      endOffset = Math.max(startOffset, Math.min(endOffset, fullText.length));

      const before = fullText.slice(0, startOffset);
      const selected = fullText.slice(startOffset, endOffset);
      const after = fullText.slice(endOffset);

      const fragment = document.createDocumentFragment();

      if (before) fragment.appendChild(document.createTextNode(before));

      if (selected) {
        const span = document.createElement("span");
        span.dataset.makeudocFontSize = "true";

        const parentElement = textNode.parentElement;
        if (parentElement) {
          const computed = window.getComputedStyle(parentElement);
          span.dataset.makeudocOriginalFontSize = computed.fontSize;
          const originalLineHeight = getOriginalLineHeightPx(parentElement);
          span.dataset.makeudocLineHeight = originalLineHeight;

          if (originalLineHeight !== "normal" && originalLineHeight !== "auto") {
            span.style.lineHeight = originalLineHeight;
          }
        }

        span.style.fontSize = size;
        span.textContent = selected;
        fragment.appendChild(span);
      }

      if (after) fragment.appendChild(document.createTextNode(after));

      textNode.parentNode?.replaceChild(fragment, textNode);
    });

    setEditorFontSize(size);
    pushEditorHistory();
    setEditorSelectionActive(true);
  };

  const resetSelectedTextFormatting = () => {
    if (!isEditingText) return;

    const selection = window.getSelection();
    const root = previewContainerRef.current;
    if (!selection || !root) return;

    let targetSpans: HTMLElement[] = [];

    if (
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      selection.toString().trim()
    ) {
      const range = selection.getRangeAt(0);
      targetSpans = Array.from(
        root.querySelectorAll<HTMLElement>('[data-makeudoc-font-size="true"]')
      ).filter((span) => {
        try {
          return range.intersectsNode(span);
        } catch {
          return false;
        }
      });
    } else {
      let node: Node | null = selection.anchorNode;
      if (node && node.nodeType !== Node.ELEMENT_NODE) {
        node = node.parentElement;
      }
      const element = node instanceof HTMLElement ? node : null;
      const editedSpan = element?.closest<HTMLElement>(
        '[data-makeudoc-font-size="true"]'
      );
      if (editedSpan) targetSpans = [editedSpan];
    }

    if (!targetSpans.length) return;

    const topLevelSpans = targetSpans.filter(
      (span) =>
        !span.parentElement?.closest<HTMLElement>(
          '[data-makeudoc-font-size="true"]'
        )
    );

    const spansToReset = topLevelSpans.length ? topLevelSpans : targetSpans;

    spansToReset.forEach((outerSpan) => {
      Array.from(
        outerSpan.querySelectorAll<HTMLElement>(
          '[data-makeudoc-font-size="true"]'
        )
      )
        .reverse()
        .forEach((nested) => {
          const parent = nested.parentNode;
          if (!parent) return;
          while (nested.firstChild) {
            parent.insertBefore(nested.firstChild, nested);
          }
          parent.removeChild(nested);
        });

      const parent = outerSpan.parentNode;
      if (!parent) return;

      while (outerSpan.firstChild) {
        parent.insertBefore(outerSpan.firstChild, outerSpan);
      }
      parent.removeChild(outerSpan);
    });

    root
      .querySelectorAll<HTMLElement>('[data-makeudoc-font-size="true"]:empty')
      .forEach((span) => span.remove());

    detectEditorFontSize();
    pushEditorHistory();
    setEditorSelectionActive(
      Boolean(
        selection && !selection.isCollapsed && selection.toString().trim()
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
    if (!isEditingText) return;
    document.execCommand(command, false);
    pushEditorHistory();
    setEditorSelectionActive(true);
  };

  const detectEditorFontSize = () => {
    if (!isEditingText) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentElement;
    }
    const element = node instanceof HTMLElement ? node : null;
    if (!element) return;

    const computedSize = window.getComputedStyle(element).fontSize;
    if (computedSize) setEditorFontSize(computedSize);
  };

  const handleEditorSelection = () => {
    if (!isEditingText) return;
    const selection = window.getSelection();
    setEditorSelectionActive(
      Boolean(
        selection && !selection.isCollapsed && selection.toString().trim()
      )
    );
    detectEditorFontSize();
  };

  /* =====================================================
     TEXT EDIT MODE
  ==================================================== */

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const editablePages = Array.from(
      container.querySelectorAll<HTMLElement>("section")
    );

    editablePages.forEach((page) => {
      page.contentEditable = isEditingText ? "true" : "false";
      page.spellcheck = isEditingText;
      page.setAttribute(
        "data-makeudoc-editable",
        isEditingText ? "true" : "false"
      );
    });

    const handleEditorInput = () => {
      if (isEditingText && !editorRestoringHistoryRef.current) {
        pushEditorHistory();
      }
    };

    if (isEditingText) {
      document.addEventListener("selectionchange", handleEditorSelection);
      requestAnimationFrame(() => detectEditorFontSize());
      editablePages.forEach((page) => {
        page.addEventListener("input", handleEditorInput);
      });
      resetEditorHistory();
    }

    return () => {
      document.removeEventListener("selectionchange", handleEditorSelection);
      editablePages.forEach((page) => {
        page.removeEventListener("input", handleEditorInput);
        page.contentEditable = "false";
        page.removeAttribute("data-makeudoc-editable");
      });
    };
  }, [isEditingText, isRendering, selectedFile]);


  /* =====================================================
     PDF FILENAME & DOWNLOAD
  ===================================================== */

  const sanitizePdfFileName = (value: string) => {
    return value
      .replace(/\\/g, "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.pdf$/i, "");
  };

  const getPdfFileName = () => {
    const cleaned = sanitizePdfFileName(pdfFileName);
    return cleaned ? `${cleaned}.pdf` : "MakeUdoc-Document.pdf";
  };

  const downloadPdf = () => {
    if (!pdfResult) return;
    const link = document.createElement("a");
    link.href = pdfResult.url;
    link.download = getPdfFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    return () => {
      if (pdfResult) {
        URL.revokeObjectURL(pdfResult.url);
      }
    };
  }, [pdfResult]);

  /* =====================================================
     RENDER UI
  ===================================================== */

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="text-center">
          <div className="mb-3 text-4xl">📄</div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Word to PDF Converter
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            Convert your Word documents to PDF online with MakeUdocs. Upload a DOCX file, preview your document, and download a PDF ready for sharing, printing, applications or submission.
          </p>
        </div>
        {/* UPLOAD CARD */}
        <WordUploader
          fileInputRef={fileInputRef}
          selectedFile={selectedFile}
          isDragging={isDragging}
          error={error}
          onFile={handleFile}
          onRemove={removeFile}
          onDraggingChange={setIsDragging}
        />


        {/* DOCUMENT PREVIEW */}
        {selectedFile && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Document Preview</h2>
                <p className="mt-1 text-xs text-zinc-500">Preview of your Word document</p>
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
                      <span className="animate-pulse text-2xl">📄</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">Preparing document preview...</p>
                    <p className="mt-1 text-xs text-zinc-500">Please wait.</p>
                  </div>
                </div>
              )}

              {renderError && (
                <div className="flex min-h-[250px] items-center justify-center px-5">
                  <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                    <div className="text-3xl">⚠️</div>
                    <p className="mt-3 text-sm font-semibold text-red-800">Conversion unavailable</p>
                    <p className="mt-2 text-xs leading-5 text-red-700">{renderError}</p>
                  </div>
                </div>
              )}

              <div
                ref={previewContainerRef}
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={endPreviewPan}
                onPointerCancel={endPreviewPan}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") {
                    endPreviewPan(event);
                  }
                }}
                className="word-preview-container max-h-[70vh] overflow-auto p-3 sm:p-6"
              />
            </div>
          </section>
        )}

        {/* TEXT EDIT CONTROLS */}
        {selectedFile && !isRendering && !renderError && !pdfResult && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-900">
                    {isEditingText ? "Text editing is ON" : "Want to edit the document?"}
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
                    setIsEditingText((current) => !current);
                    setEditorSelectionActive(false);
                  }}
                  className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition active:scale-[0.98] ${
                    isEditingText
                      ? "border border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                      : "bg-amber-600 text-white hover:bg-amber-700"
                  }`}
                >
                  {isEditingText ? "✓ Done Editing" : "✏️ Edit Text"}
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
                        onChange={(event) => applyEditorFontSize(event.target.value)}
                        disabled={!editorSelectionActive}
                        className="h-9 w-[76px] rounded-lg border-0 bg-zinc-50 px-2 text-xs font-bold text-zinc-800 outline-none transition hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Font size"
                      >
                        {[
                          "8px", "9px", "10px", "11px", "12px", "14px",
                          "16px", "18px", "20px", "24px", "28px", "32px",
                          "36px", "48px", "72px",
                        ].map((sz) => (
                          <option key={sz} value={sz}>{sz.replace("px", "")}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={resetSelectedTextFormatting}
                        disabled={!isEditingText}
                        className="h-9 rounded-lg px-2.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ↺ <span className="ml-1 hidden sm:inline">Reset</span>
                      </button>
                    </div>

                    {/* TEXT STYLE */}
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("bold")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("italic")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold italic text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("underline")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold text-zinc-800 underline decoration-2 underline-offset-2 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        U
                      </button>
                    </div>

                    {/* ALIGNMENT */}
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("justifyLeft")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ☰
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("justifyCenter")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ≡
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("justifyRight")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ≡
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runEditorCommand("justifyFull")}
                        disabled={!editorSelectionActive}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ☰
                      </button>
                    </div>

                    {/* HISTORY */}
                    <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={undoEditorChange}
                        className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        ↶ <span className="hidden sm:inline">Undo</span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={redoEditorChange}
                        className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        ↷ <span className="hidden sm:inline">Redo</span>
                      </button>
                    </div>

                    <span className="ml-auto hidden rounded-lg bg-blue-50 px-2.5 py-2 text-[11px] font-semibold text-blue-700 sm:inline-flex">
                      {editorSelectionActive ? "Text selected" : "Select text to format"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONVERT BUTTON */}
        {selectedFile && !isRendering && !renderError && !pdfResult && (
          <div className="mt-6">
            <button
              type="button"
              onClick={convertToPdf}
              disabled={isConverting}
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConverting ? "Converting to PDF..." : "Convert to PDF"}
            </button>
          </div>
        )}

        {/* PDF RESULT */}
        {pdfResult && (
          <section className="mt-6">
            <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl">
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-zinc-900">PDF Ready</h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">{getPdfFileName()}</p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                <iframe
                  src={pdfResult.url}
                  title="PDF Preview"
                  className="h-[65vh] min-h-[450px] w-full"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="pdf-file-name" className="mb-2 block text-sm font-semibold text-zinc-800">
                  PDF file name
                </label>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    id="pdf-file-name"
                    type="text"
                    value={pdfFileName}
                    onChange={(e) => setPdfFileName(e.target.value)}
                    onBlur={() => setPdfFileName(sanitizePdfFileName(pdfFileName))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
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
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!sanitizePdfFileName(pdfFileName)}
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  ⬇️ Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pdfResult) URL.revokeObjectURL(pdfResult.url);
                    setPdfResult(null);
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

        {/* INFO */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
          <strong>MakeUdoc:</strong> Your Word document is processed locally in the browser.
        </div>

        <WordToPdfSeoContent />
      </div>

      {/* STYLES */}
      <style>{`
        .word-preview-container {
          -webkit-overflow-scrolling: touch;
          touch-action: none;
          overscroll-behavior: contain;
          cursor: grab;
          user-select: none;
          overflow-x: auto !important;
          overflow-y: auto !important;
          position: relative;
          box-sizing: border-box;
        }

        .word-preview-container > .docx-wrapper {
          width: max-content !important;
          min-width: 100% !important;
          margin: 0 !important;
        }

        .word-preview-container.word-preview-panning {
          cursor: grabbing;
          scroll-behavior: auto !important;
        }

        .word-preview-container [data-makeudoc-editable="true"],
        .word-preview-container [data-makeudoc-editable="true"] * {
          user-select: text;
        }
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
        .word-preview-container p {
          overflow-wrap: anywhere;
        }
        .word-preview-container [data-makeudoc-font-size="true"] {
          display: inline !important;
          vertical-align: baseline;
        }
        .word-preview-container [data-makeudoc-editable="true"] {
          cursor: text !important;
          caret-color: #2563eb;
          outline: 2px dashed rgba(245, 158, 11, 0.55);
          outline-offset: 4px;
        }
        .word-preview-container [data-makeudoc-editable="true"] * {
          cursor: text !important;
        }
        .word-preview-container .docx-wrapper {
          background: #e4e4e7 !important;
          padding: 20px 0 !important;
        }
        .word-preview-container .docx-wrapper > section {
          margin: 0 0 20px 0 !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
        }

        .word-preview-container .docx-wrapper > section:first-child {
          margin-top: 0 !important;
        }
        .word-preview-container .docx-wrapper > section:last-child {
          margin-bottom: 0 !important;
        }
        @media (max-width: 640px) {
          .word-preview-container {
            padding: 8px !important;
          }
          .word-preview-container .docx-wrapper {
            padding: 10px 0 !important;
          }
          .word-preview-container .docx-wrapper > section {
            margin: 0 0 12px 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
