"use client";

import { useRef, useState } from "react";

export default function JpgToPngPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const choose = (next?: File) => {
    if (!next) return;
    const isJpg = next.type === "image/jpeg" || /\.(jpe?g)$/i.test(next.name);
    if (!isJpg) {
      setError("Please select a JPG or JPEG image.");
      return;
    }
    setError("");
    setDone(false);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const convert = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const image = new Image();
      image.decoding = "async";
      const objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not create an image canvas.");
      ctx.drawImage(image, 0, 0);
      URL.revokeObjectURL(objectUrl);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create the PNG image.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${file.name.replace(/\.jpe?g$/i, "")}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not convert this image.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setDone(false);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🖼️</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Image Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">JPG to PNG</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Convert JPG and JPEG images to PNG without uploading them to a server. Your original image stays on your device.</p>
        </div>

        <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300 hover:bg-blue-50/30"}`}>
              <input ref={inputRef} type="file" accept="image/jpeg,.jpg,.jpeg" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">🖼️</span>
              <h2 className="mt-6 text-xl font-extrabold">Drop a JPG here</h2>
              <p className="mt-2 text-sm text-zinc-500">or choose a JPG/JPEG image from your device</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose Image →</span>
              <p className="mt-4 text-xs font-semibold text-zinc-400">Free · No signup · Browser-local</p>
            </label>
          ) : (
            <div>
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "JPEG"}</p></div>
                <button type="button" onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="flex min-h-[460px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5">
                  <img src={preview} alt="JPG preview" className="max-h-[600px] max-w-full rounded-lg object-contain shadow-xl" />
                </div>
                <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Conversion</p>
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-bold text-zinc-500">Input</p><p className="mt-1 text-sm font-extrabold">JPG / JPEG</p></div>
                  <div className="my-3 text-center text-lg font-black text-blue-600">↓</div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">Output</p><p className="mt-1 text-sm font-extrabold">PNG</p><p className="mt-1 text-xs text-zinc-500">Full original resolution</p></div>
                  <button type="button" onClick={convert} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,.2)] disabled:opacity-60">{busy ? "Converting…" : "Convert to PNG →"}</button>
                  {done && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">✓ PNG created and downloaded successfully.</div>}
                </aside>
              </div>
            </div>
          )}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">⚡</span><h3 className="mt-3 text-sm font-extrabold">Fast conversion</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Conversion happens directly in your browser with no waiting for an upload.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✨</span><h3 className="mt-3 text-sm font-extrabold">Original resolution</h3><p className="mt-1 text-xs leading-5 text-zinc-500">The source image dimensions are preserved during conversion.</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image stays on your device throughout the conversion.</p></div>
        </section>
      </div>
    </main>
  );
}
