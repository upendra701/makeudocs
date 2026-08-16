import { ChangeEvent, DragEvent, RefObject } from "react";
import { formatFileSize, WORD_DOCUMENT_ACCEPT } from "../lib/fileUtils";

type WordUploaderProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  isDragging: boolean;
  error: string;
  onFile: (file: File) => void;
  onRemove: () => void;
  onDraggingChange: (isDragging: boolean) => void;
};

export function WordUploader({
  fileInputRef,
  selectedFile,
  isDragging,
  error,
  onFile,
  onRemove,
  onDraggingChange,
}: WordUploaderProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDraggingChange(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          onDraggingChange(true);
        }}
        onDragLeave={() => onDraggingChange(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
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
          {isDragging ? "Drop your Word document here" : "Upload a Word document"}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Drag and drop your .docx file here, or tap to choose one from your device.
        </p>
        <span className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
          Choose Word File
        </span>
        <p className="mt-4 text-xs text-zinc-400">Supported format: .docx</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={WORD_DOCUMENT_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

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
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
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
  );
}
