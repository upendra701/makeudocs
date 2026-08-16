export const WORD_DOCUMENT_ACCEPT =
  ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const isDocxFile = (file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "docx";
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const sanitizePdfFileName = (value: string) => {
  return value
    .replace(/\\/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.pdf$/i, "");
};

export const getDefaultPdfFileName = (fileName: string) =>
  fileName.replace(/\.docx$/i, "");

export const getPdfDownloadName = (value: string) => {
  const cleaned = sanitizePdfFileName(value);
  return cleaned ? `${cleaned}.pdf` : "MakeUdoc-Document.pdf";
};
