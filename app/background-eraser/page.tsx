"use client";

import { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const MAX_SIZE = 2400;

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this image.")); };
    image.src = url;
  });
}

function fitSize(width: number, height: number) {
  const ratio = Math.min(1, MAX_SIZE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function colorDistance(data: Uint8ClampedArray, a: number, b: number) {
  return Math.sqrt((data[a] - data[b]) ** 2 + (data[a + 1] - data[b + 1]) ** 2 + (data[a + 2] - data[b + 2]) ** 2);
}

export default function BackgroundEraserPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [brushSize, setBrushSize] = useState(35);
  const [mode, setMode] = useState<"erase" | "restore">("erase");
  const [tolerance, setTolerance] = useState(42);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const snapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) undoRef.current = [...undoRef.current.slice(-9), ctx.getImageData(0, 0, canvas.width, canvas.height)];
  };

  const drawBase = (source: HTMLCanvasElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = source.width; canvas.height = source.height;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(source, 0, 0);
  };

  const choose = async (next?: File) => {
    if (!next) return;
    if (!/^image\/(jpeg|png|webp)$/.test(next.type) && !/\.(jpe?g|png|webp)$/i.test(next.name)) { setError("Please choose a JPG, PNG, or WebP image."); return; }
    setBusy(true); setError(""); setMessage(""); undoRef.current = [];
    try {
      const image = await loadImage(next);
      const size = fitSize(image.naturalWidth, image.naturalHeight);
      const base = document.createElement("canvas"); base.width = size.width; base.height = size.height;
      const ctx = base.getContext("2d"); if (!ctx) throw new Error("Your browser could not create an image canvas.");
      ctx.drawImage(image, 0, 0, size.width, size.height);
      baseRef.current = base; drawBase(base);
      setFile(next); setDimensions(size);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open this image."); }
    finally { setBusy(false); }
  };

  const autoErase = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    snapshot(); setBusy(true); setMessage("Removing the edge-connected background…");
    requestAnimationFrame(() => {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = image.data;
      const w = canvas.width, h = canvas.height; const seen = new Uint8Array(w * h); const queue = new Int32Array(w * h); let head = 0, tail = 0;
      const seeds = [0, w - 1, (h - 1) * w, h * w - 1];
      const seedColor = (idx: number) => idx * 4;
      let sr = 0, sg = 0, sb = 0; for (const p of seeds) { const i = seedColor(p); sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; } sr /= 4; sg /= 4; sb /= 4;
      const threshold = Math.max(8, tolerance * 2.2);
      const similar = (p: number) => { const i = p * 4; return Math.sqrt((data[i] - sr) ** 2 + (data[i + 1] - sg) ** 2 + (data[i + 2] - sb) ** 2) <= threshold; };
      for (const p of seeds) if (similar(p)) { seen[p] = 1; queue[tail++] = p; }
      while (head < tail) {
        const p = queue[head++]; data[p * 4 + 3] = 0;
        const x = p % w, y = Math.floor(p / w);
        const neighbors = [p - 1, p + 1, p - w, p + w];
        if (x === 0) neighbors[0] = -1; if (x === w - 1) neighbors[1] = -1; if (y === 0) neighbors[2] = -1; if (y === h - 1) neighbors[3] = -1;
        for (const n of neighbors) if (n >= 0 && n < w * h && !seen[n] && similar(n)) { seen[n] = 1; queue[tail++] = n; }
      }
      ctx.putImageData(image, 0, 0); setBusy(false); setMessage(`Removed approximately ${Math.round((tail / (w * h)) * 100)}% of the image background.`);
    });
  };

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!; const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };

  const brush = (point: Point) => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    if (mode === "erase") ctx.globalCompositeOperation = "destination-out";
    else {
      ctx.globalCompositeOperation = "source-over";
      const base = baseRef.current; if (!base) { ctx.restore(); return; }
      ctx.globalCompositeOperation = "source-over";
      const size = brushSize * Math.max(canvas.width, canvas.height) / 1200;
      ctx.drawImage(base, point.x - size / 2, point.y - size / 2, size, size, point.x - size / 2, point.y - size / 2, size, size);
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.arc(point.x, point.y, brushSize * Math.max(canvas.width, canvas.height) / 2400, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => { if (busy) return; snapshot(); drawingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); brush(pointFromEvent(event)); };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => { if (drawingRef.current) brush(pointFromEvent(event)); };
  const pointerUp = () => { drawingRef.current = false; };

  const undo = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); const previous = undoRef.current.pop();
    if (canvas && ctx && previous) { ctx.putImageData(previous, 0, 0); setMessage("Last edit undone."); }
  };

  const reset = () => { if (baseRef.current) drawBase(baseRef.current); undoRef.current = []; setMessage("Original image restored."); };

  const download = (type: "png" | "jpeg") => {
    const canvas = canvasRef.current; if (!canvas) return;
    const exportCanvas = document.createElement("canvas"); exportCanvas.width = canvas.width; exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d"); if (!ctx) return;
    if (type === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height); }
    ctx.drawImage(canvas, 0, 0);
    exportCanvas.toBlob((blob) => {
      if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${file?.name.replace(/\.[^.]+$/, "") || "image"}-no-background.${type}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage(`Downloaded ${type.toUpperCase()} successfully.`);
    }, type === "png" ? "image/png" : "image/jpeg", type === "jpeg" ? 0.94 : undefined);
  };

  useEffect(() => () => { undoRef.current = []; }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">✂️</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Image Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">Background Eraser</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Remove connected image backgrounds, fine-tune the result with an erase or restore brush, and download a transparent PNG — entirely in your browser.</p></header>
        <section className="mt-9 overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,.07)]">
          {!file ? <label className="m-5 flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-zinc-300 bg-gradient-to-b from-white to-slate-50 px-6 text-center hover:border-blue-300 hover:bg-blue-50/30 sm:m-7"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e)=>choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">🖼️</span><h2 className="mt-6 text-xl font-extrabold">Drop an image here</h2><p className="mt-2 text-sm text-zinc-500">JPG, PNG, or WebP · processed locally</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose Image →</span></label> : <div className="grid lg:grid-cols-[260px_1fr]">
            <aside className="border-b border-zinc-200 bg-zinc-50 p-5 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Tools</p><button onClick={()=>inputRef.current?.click()} className="text-xs font-bold text-blue-600">Change</button></div><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e)=>choose(e.target.files?.[0])}/>
              <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-xs font-extrabold text-zinc-500">Automatic removal</p><button onClick={autoErase} disabled={busy} className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">{busy ? "Removing…" : "Remove Background"}</button><p className="mt-2 text-[11px] leading-4 text-zinc-400">Works best when the background is connected to the image edges and has a reasonably consistent color.</p></div>
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-xs font-extrabold text-zinc-500">Brush</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setMode("erase")} className={`rounded-xl px-3 py-2.5 text-xs font-extrabold ${mode==="erase"?"bg-blue-600 text-white":"border border-zinc-200 bg-white"}`}>Erase</button><button onClick={()=>setMode("restore")} className={`rounded-xl px-3 py-2.5 text-xs font-extrabold ${mode==="restore"?"bg-blue-600 text-white":"border border-zinc-200 bg-white"}`}>Restore</button></div><label className="mt-4 block text-xs font-bold">Brush size <span className="float-right text-zinc-500">{brushSize}px</span><input type="range" min="8" max="100" value={brushSize} onChange={(e)=>setBrushSize(Number(e.target.value))} className="mt-2 w-full accent-blue-600"/></label><label className="mt-4 block text-xs font-bold">Auto erase tolerance <span className="float-right text-zinc-500">{tolerance}</span><input type="range" min="10" max="80" value={tolerance} onChange={(e)=>setTolerance(Number(e.target.value))} className="mt-2 w-full accent-blue-600"/></label></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={undo} disabled={!undoRef.current.length} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-extrabold disabled:opacity-40">↶ Undo</button><button onClick={reset} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-extrabold">Reset</button></div>
            </aside>
            <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white p-4"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{dimensions.width} × {dimensions.height}px · {mode === "erase" ? "Erase mode" : "Restore mode"}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">🔒 Browser-local</span></div>
              <div className="overflow-auto bg-slate-100 p-5 sm:p-8"><div className="relative mx-auto w-fit overflow-hidden rounded-xl border border-zinc-300 shadow-xl" style={{ backgroundImage:"linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)", backgroundSize:"24px 24px", backgroundPosition:"0 0,0 12px,12px -12px,-12px 0" }}><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className="block h-auto max-h-[650px] max-w-full touch-none cursor-crosshair"/></div></div>
              <div className="flex flex-col gap-3 border-t border-zinc-200 bg-white p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1 text-xs text-zinc-500">{message || "Use Remove Background first, then refine edges with the brush."}</div><div className="flex gap-2"><button onClick={()=>download("jpeg")} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-extrabold">Download JPG</button><button onClick={()=>download("png")} className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-xs font-extrabold text-white shadow-lg">Download PNG →</button></div></div>
            </div></div>}
          {error && <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-7">{error}</div>}
        </section>
        <section className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">⚡</span><h3 className="mt-3 text-sm font-extrabold">Automatic removal</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Edge-connected backgrounds can be removed in one click.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🖌️</span><h3 className="mt-3 text-sm font-extrabold">Manual control</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Erase unwanted areas or restore parts with the brush.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✨</span><h3 className="mt-3 text-sm font-extrabold">Transparent PNG</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Export the result with transparency preserved.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image stays on your device.</p></div></section>
      </div>
    </main>
  );
}
