"use client";

import { ChangeEvent, DragEvent, RefObject, useCallback, useState } from "react";
import { PdfResult } from "../types";
import { isDocxFile } from "../lib/fileUtils";

type UseWordDocumentOptions = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  previewContainerRef: RefObject<HTMLDivElement | null>;
  pdfResult: PdfResult | null;
  setPdfResult: (value: PdfResult | null) => void;
  setPdfFileName: (value: string) => void;
  setIsEditingText: (value: boolean) => void;
  setEditorSelectionActive: (value: boolean) => void;
  setEditorFontSize: (value: string) => void;
  resetEditorHistory: () => void;
};

export function useWordDocument({
  fileInputRef,
  previewContainerRef,
  pdfResult,
  setPdfResult,
  setPdfFileName,
  setIsEditingText,
  setEditorSelectionActive,
  setEditorFontSize,
  resetEditorHistory,
}: UseWordDocumentOptions) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [renderError, setRenderError] = useState("");

  const clearPdfResult = useCallback(() => {
    if (pdfResult) {
      URL.revokeObjectURL(pdfResult.url);
    }
    setPdfResult(null);
    setPdfFileName("");
  }, [pdfResult, setPdfFileName, setPdfResult]);

  const resetDocumentUi = useCallback(() => {
    setIsEditingText(false);
    setEditorSelectionActive(false);
    setEditorFontSize("16px");
    resetEditorHistory();
  }, [resetEditorHistory, setEditorFontSize, setEditorSelectionActive, setIsEditingText]);

  const handleFile = useCallback(
    (file: File) => {
      setError("");
      setRenderError("");
      clearPdfResult();
      resetDocumentUi();

      if (!isDocxFile(file)) {
        setSelectedFile(null);
        setError("Please select a Word .docx file.");
        return;
      }

      setSelectedFile(file);
    },
    [clearPdfResult, resetDocumentUi]
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      handleFile(file);
    },
    [handleFile]
  );

  const removeFile = useCallback(() => {
    clearPdfResult();
    setSelectedFile(null);
    setError("");
    setRenderError("");
    resetDocumentUi();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (previewContainerRef.current) {
      previewContainerRef.current.innerHTML = "";
    }
  }, [clearPdfResult, fileInputRef, previewContainerRef, resetDocumentUi]);

  return {
    selectedFile,
    isDragging,
    setIsDragging,
    error,
    setError,
    renderError,
    setRenderError,
    handleFile,
    handleFileChange,
    handleDrop,
    removeFile,
  };
}
