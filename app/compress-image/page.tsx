"use client";

import { useEffect, useRef, useState } from "react";

type Format = "image/jpeg" | "image/webp" | "image/png";

const formatLabel: Record<Format, string> = { "image/jpeg": "JPG", "image/webp": "WebP", "image/png": "PNG" };

export default function CompressImagePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [maxWidth, setMaxWidth] = useState(0);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<Format>("image/jpeg");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [resultSize, setResultSize] = useState(0);

  const choose = (next?: File) => {
    if (!next) return;
    if (!next.type.startsWith("image/") || !/\.(jpe?g|png|webp)$/i.test(next.name)) { setError("Please select a JPG, PNG, or WebP image."); return; }
    const url = URL.createObjectURL(next);
    const image = new Image();
    image.onload = () => {
      setFile(next); setSourceUrl(url); setWidth(image.naturalWidth); setHeight(image.naturalHeight); setMaxWidth(image.naturalWidth); setDone(false); setResultSize(0); setError("");
    };
    image.onerror = () => { URL.revokeObjectURL(url); setError("The source image could not be decoded. Please try another image."); };
    image.src = url;
  };

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);

  const outputDimensions = () => {
    const target = Math.max(1, Math.min(maxWidth || width, width));
    const scale = target / width;
    return { width: Math.round(target), height: Math.max(1, Math.round(height * scale)) };
  };

  const compress = async () => {
    if (!file || !sourceUrl || !width) return;
    setBusy(true); setDone(false); setError("");
    try {
      const image = new Image(); image.src = sourceUrl; await image.decode();
      const size = outputDimensions(); const canvas = document.createElement("canvas"); canvas.width = size.width; canvas.height = size.height;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Your browser could not create an image canvas.");
      if (format === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, format, format === "image/png" ? undefined : quality / 100));
      if (!blob) throw new Error("Could not create the compressed image.");
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file.name.replace(/\.(jpe?g|png|webp)$/i, "")}-compressed.${format === "image/jpeg" ? "jpg" : format === "image/webp" ? "webp" : "png"}`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setResultSize(blob.size); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not compress this image."); }
    finally { setBusy(false); }
  };

  const reset = () => { setFile(null); setSourceUrl(""); setWidth(0); setHeight(0); setMaxWidth(0); setDone(false); setResultSize(0); setError(""); if (inputRef.current) inputRef.current.value = ""; };
  const output = outputDimensions();
  const reduction = file && resultSize ? Math.max(0, Math.round((1 - resultSize / file.size) * 100)) : 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12"><div className="mx-auto max-w-6xl">
      <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">⚡</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Image Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Image Compressor</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Reduce image file size, resize large images, and choose your output format without uploading anything.</p></div>
      <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
        {!file ? <label onDragOver={(e)=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files?.[0])}} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging?"border-blue-500 bg-blue-50":"border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300"}`}><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e)=>choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">🖼️</span><h2 className="mt-6 text-xl font-extrabold">Drop an image here</h2><p className="mt-2 text-sm text-zinc-500">JPG, PNG or WebP</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose Image →</span><p className="mt-4 text-xs font-semibold text-zinc-400">Free · No signup · Browser-local</p></label> : <div>
          <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size/1024/1024).toFixed(2)} MB · {width} × {height}px</p></div><button type="button" onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Choose another</button></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]"><div className="flex min-h-[460px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 p-5"><img src={sourceUrl} alt="Image preview" className="max-h-[600px] max-w-full rounded-lg object-contain shadow-xl" /></div>
            <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Compression</p><div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-bold text-zinc-500">Original</p><p className="mt-1 text-sm font-extrabold">{(file.size/1024/1024).toFixed(2)} MB</p></div><label className="mt-4 block text-xs font-extrabold">Output format<select value={format} onChange={(e)=>setFormat(e.target.value as Format)} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option></select></label><label className="mt-4 block text-xs font-extrabold">Maximum width <span className="float-right text-zinc-500">{maxWidth}px</span><input type="range" min="320" max={width} step="10" value={maxWidth} onChange={(e)=>setMaxWidth(Number(e.target.value))} className="mt-2 w-full accent-blue-600" /></label>{format !== "image/png" && <label className="mt-4 block text-xs font-extrabold">Quality <span className="float-right text-zinc-500">{quality}%</span><input type="range" min="40" max="100" value={quality} onChange={(e)=>setQuality(Number(e.target.value))} className="mt-2 w-full accent-blue-600" /></label>}<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">Estimated output</p><p className="mt-1 text-sm font-extrabold">{output.width} × {output.height}px</p><p className="mt-1 text-xs text-zinc-500">Exact size shown after compression</p></div><button type="button" onClick={compress} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?"Compressing…":"Compress & Download →"}</button>{done&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">✓ Downloaded {formatLabel[format]} · {(resultSize/1024/1024).toFixed(2)} MB{reduction>0?` · ${reduction}% smaller`:""}</div>}</aside>
          </div></div>}
        {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      </section>
      <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📉</span><h3 className="mt-3 text-sm font-extrabold">Smaller files</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Reduce file size for websites, forms, email and sharing.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📐</span><h3 className="mt-3 text-sm font-extrabold">Resize too</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Scale down oversized images while keeping their proportions.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image stays on your device during compression.</p></div></section>
    </div></main>
  );
}
