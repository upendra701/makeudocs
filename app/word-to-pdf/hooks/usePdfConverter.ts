"use client";

import { useCallback } from "react";
import type { PdfResult } from "../types";
import { convertRenderedDocxToPdf } from "../lib/pdfConverter";

type UsePdfConverterOptions = {
  selectedFile: File | null;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  setIsConverting: (value: boolean) => void;
  setRenderError: (value: string) => void;
  setPdfResult: (value: PdfResult | null) => void;
  setPdfFileName: (value: string) => void;
};

export function usePdfConverter({
  selectedFile,
  previewContainerRef,
  setIsConverting,
  setRenderError,
  setPdfResult,
  setPdfFileName,
}: UsePdfConverterOptions) {
  return useCallback(async () => {
    if (!selectedFile || !previewContainerRef.current) return;

    try {
      setIsConverting(true);
      setRenderError("");
      const pdfBytes = await convertRenderedDocxToPdf(previewContainerRef.current);

      const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
      new Uint8Array(pdfBuffer).set(pdfBytes);

      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const originalName = selectedFile.name.replace(/\.docx$/i, "");

      setPdfResult({
        url,
        fileName: `${originalName}.pdf`,
      });
      setPdfFileName(originalName);
    } catch (error) {
      console.error("DOCX to PDF conversion failed:", error);
      setRenderError("Unable to convert this Word document to PDF. Please try again with another document.");
    } finally {
      setIsConverting(false);
    }
  }, [
    previewContainerRef,
    selectedFile,
    setIsConverting,
    setPdfFileName,
    setPdfResult,
    setRenderError,
  ]);
}
