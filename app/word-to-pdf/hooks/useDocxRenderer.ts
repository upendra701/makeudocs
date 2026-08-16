"use client";

import { useEffect } from "react";
import { normalizeDocxTableLayout } from "../lib/docxLayout";

type UseDocxRendererOptions = {
  selectedFile: File | null;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  setIsRendering: (value: boolean) => void;
  setRenderError: (value: string) => void;
};

export function useDocxRenderer({
  selectedFile,
  previewContainerRef,
  setIsRendering,
  setRenderError,
}: UseDocxRendererOptions) {
  useEffect(() => {
    let cancelled = false;

    async function renderDocument() {
      if (!selectedFile || !previewContainerRef.current) return;

      setIsRendering(true);
      setRenderError("");

      const container = previewContainerRef.current;
      container.innerHTML = "";

      try {
        const { renderAsync } = await import("docx-preview");

        if (cancelled) return;

        await renderAsync(selectedFile, container, undefined, {
          className: "docx-preview",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (cancelled) return;

        await normalizeDocxTableLayout(container);

        if (cancelled) return;
      } catch (error) {
        console.error("DOCX preview failed:", error);
        if (!cancelled) {
          setRenderError("Unable to preview this Word document. Please try another .docx file.");
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
  }, [selectedFile, previewContainerRef, setIsRendering, setRenderError]);
}
