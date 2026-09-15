"use client";

import { useEffect, useRef, useState } from "react";

export default function PngToJpgPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [quality, setQuality] = useState(92);
  const [background, setBackground] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const choose = (next?: File) => {
    if (!next) return;
    const isPng = next.type === "image/png" || /\.png$/i.test(next.name);
    if (!isPng) { setError("Please select a PNG image."); return; }
    setError(""); setDone(false); setFile(next);
    const url = URL.createObjectURL(next); setPreview(url);
    const image = new Image();
    image.onload = () => { setDimensions({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.src = url;
  };

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const convert = async () => {
    if (!file || !preview) return;
    setBusy(true); setError(""); setDone(false);
    try {
      const image = new Image(); image.src = preview; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Your browser could not create an image canvas.");
      ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality / 100));
      if (!blob) throw new Error("Could not create the JPG image.");
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file.name.replace(/\.png$/i, "")}.jpg`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not convert this image."); }
    finally { setBusy(false); }
  };

  const reset = () => { setFile(null); setPreview(""); setDimensions({ width: 0, height: 0 }); setDone(false); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🖼️</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Image Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">PNG to JPG</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Convert PNG images to JPG, choose the background color for transparent areas, and control output quality — entirely in your browser.</p></div>
        <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? <label onDragOver={(e)=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={(e)=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files?.[0])}} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging?"border-blue-500 bg-blue-50":"border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300 hover:bg-blue-50/30"}`}><input ref={inputRef} type="file" accept="image/png,.png" className="hidden" onChange={(e)=>choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">🖼️</span><h2 className="mt-6 text-xl font-extrabold">Drop a PNG here</h2><p className="mt-2 text-sm text-zinc-500">or choose a PNG image from your device</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose Image →</span><p className="mt-4 text-xs font-semibold text-zinc-400">Free · No signup · Browser-local</p></label> : <div><div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size/1024/1024).toFixed(2)} MB · {dimensions.width} × {dimensions.height}px</p></div><button onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Choose another</button></div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]"><div className="flex min-h-[460px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5"><img src={preview} alt="PNG preview" className="max-h-[600px] max-w-full rounded-lg object-contain shadow-xl" /></div><aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Conversion</p><div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-bold text-zinc-500">Input</p><p className="mt-1 text-sm font-extrabold">PNG</p></div><div className="my-3 text-center text-lg font-black text-blue-600">↓</div><div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">Output</p><p className="mt-1 text-sm font-extrabold">JPG</p><p className="mt-1 text-xs text-zinc-500">Full original resolution</p></div><label className="mt-5 block text-xs font-extrabold">Background color <span className="float-right font-normal text-zinc-500">For transparent areas</span><input type="color" value={background} onChange={(e)=>setBackground(e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1" /></label><label className="mt-5 block text-xs font-extrabold">JPG quality <span className="float-right text-zinc-500">{quality}%</span><input type="range" min="50" max="100" value={quality} onChange={(e)=>setQuality(Number(e.target.value))} className="mt-2 w-full accent-blue-600" /></label><button onClick={convert} disabled={busy} className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?"Converting…":"Convert to JPG →"}</button>{done&&<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">✓ JPG created and downloaded successfully.</div>}</aside></div></div>}
          {error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🎨</span><h3 className="mt-3 text-sm font-extrabold">Transparency control</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Choose the color used where the PNG is transparent.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">⚙️</span><h3 className="mt-3 text-sm font-extrabold">Quality control</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Balance JPG file size and image quality with the quality slider.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your PNG stays on your device throughout conversion.</p></div></section>
      </div>
    </main>
  );
}
