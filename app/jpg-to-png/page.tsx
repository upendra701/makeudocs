"use client";

import { useRef, useState } from "react";

type EditMode = "convert" | "erase" | "restore";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this image.")); };
    image.src = url;
  });
}

function safeSize(width: number, height: number) {
  const max = 2400;
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export default function JpgToPngPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const undoRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState<EditMode>("convert");
  const [brushSize, setBrushSize] = useState(35);
  const [tolerance, setTolerance] = useState(42);

  const snapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) undoRef.current = [...undoRef.current.slice(-9), ctx.getImageData(0, 0, canvas.width, canvas.height)];
  };

  const syncPreview = () => {
    const canvas = canvasRef.current;
    if (canvas) setPreview(canvas.toDataURL("image/jpeg", 0.9));
  };

  const choose = async (next?: File) => {
    if (!next) return;
    const isJpg = next.type === "image/jpeg" || /\.(jpe?g)$/i.test(next.name);
    if (!isJpg) { setError("Please select a JPG or JPEG image."); return; }
    setBusy(true); setError(""); setDone(false); undoRef.current = [];
    try {
      const image = await loadImage(next);
      const size = safeSize(image.naturalWidth, image.naturalHeight);
      const base = document.createElement("canvas"); base.width = size.width; base.height = size.height;
      const ctx = base.getContext("2d"); if (!ctx) throw new Error("Your browser could not create an image canvas.");
      ctx.drawImage(image, 0, 0, size.width, size.height);
      baseRef.current = base;
      const canvas = canvasRef.current;
      if (canvas) { canvas.width = size.width; canvas.height = size.height; const c = canvas.getContext("2d"); c?.drawImage(base, 0, 0); }
      setFile(next); setDimensions(size); setMode("convert");
      setPreview(URL.createObjectURL(next));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open this image."); }
    finally { setBusy(false); }
  };

  const autoErase = () => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    snapshot(); setBusy(true); setError(""); setDone(false);
    requestAnimationFrame(() => {
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = image.data;
      const w = canvas.width, h = canvas.height; const total = w * h; const seen = new Uint8Array(total); const queue = new Int32Array(total);
      const corners = [0, w - 1, (h - 1) * w, total - 1];
      let sr = 0, sg = 0, sb = 0;
      corners.forEach((p) => { const i = p * 4; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; }); sr /= 4; sg /= 4; sb /= 4;
      const threshold = Math.max(10, tolerance * 2.2);
      const similar = (p: number) => { const i = p * 4; return Math.hypot(data[i] - sr, data[i + 1] - sg, data[i + 2] - sb) <= threshold; };
      let head = 0, tail = 0;
      corners.forEach((p) => { if (similar(p) && !seen[p]) { seen[p] = 1; queue[tail++] = p; } });
      while (head < tail) {
        const p = queue[head++]; data[p * 4 + 3] = 0; const x = p % w; const y = Math.floor(p / w);
        if (x > 0 && !seen[p - 1] && similar(p - 1)) { seen[p - 1] = 1; queue[tail++] = p - 1; }
        if (x < w - 1 && !seen[p + 1] && similar(p + 1)) { seen[p + 1] = 1; queue[tail++] = p + 1; }
        if (y > 0 && !seen[p - w] && similar(p - w)) { seen[p - w] = 1; queue[tail++] = p - w; }
        if (y < h - 1 && !seen[p + w] && similar(p + w)) { seen[p + w] = 1; queue[tail++] = p + w; }
      }
      ctx.putImageData(image, 0, 0); setMode("erase"); setBusy(false); setMessage(`Background removed from about ${Math.round((tail / total) * 100)}% of the image.`); syncPreview();
    });
  };

  const [message, setMessage] = useState("");

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!; const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };

  const brush = (x: number, y: number) => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const radius = Math.max(4, brushSize * Math.max(canvas.width, canvas.height) / 2400);
    ctx.save();
    if (mode === "erase") { ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
    else if (mode === "restore" && baseRef.current) {
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(baseRef.current, x - radius, y - radius, radius * 2, radius * 2, x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => { if (busy || mode === "convert") return; snapshot(); drawingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); const p = point(event); brush(p.x, p.y); };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawingRef.current) return; const p = point(event); brush(p.x, p.y); };
  const pointerUp = () => { if (drawingRef.current) { drawingRef.current = false; syncPreview(); } };

  const undo = () => { const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); const previous = undoRef.current.pop(); if (canvas && ctx && previous) { ctx.putImageData(previous, 0, 0); syncPreview(); setMessage("Last edit undone."); } };
  const reset = () => { const canvas = canvasRef.current; const base = baseRef.current; if (canvas && base) { const ctx = canvas.getContext("2d"); if (ctx) { canvas.width = base.width; canvas.height = base.height; ctx.drawImage(base, 0, 0); } } undoRef.current = []; setMode("convert"); setDone(false); setMessage("Original image restored."); syncPreview(); };

  const convert = async () => {
    if (!file || !canvasRef.current) return;
    setBusy(true); setError(""); setDone(false);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create the PNG image.");
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${file.name.replace(/\.jpe?g$/i, "")}.png`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(true); setMessage(mode === "convert" ? "PNG created and downloaded successfully." : "PNG with your background edits downloaded successfully.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not convert this image."); }
    finally { setBusy(false); }
  };

  const resetFile = () => { setFile(null); setPreview(""); setDone(false); setError(""); setMessage(""); setMode("convert"); undoRef.current = []; if (inputRef.current) inputRef.current.value = ""; };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🖼️</div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs Image Tools</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">JPG to PNG</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Convert JPG to PNG and optionally remove the background before downloading — all in your browser.</p>
        </div>

        <section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">
          {!file ? (
            <label onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]); }} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300 hover:bg-blue-50/30"}`}>
              <input ref={inputRef} type="file" accept="image/jpeg,.jpg,.jpeg" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
              <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">🖼️</span>
              <h2 className="mt-6 text-xl font-extrabold">Drop a JPG here</h2><p className="mt-2 text-sm text-zinc-500">or choose a JPG/JPEG image from your device</p>
              <span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,.22)]">Choose Image →</span>
              <p className="mt-4 text-xs font-semibold text-zinc-400">Free · No signup · Browser-local</p>
            </label>
          ) : (
            <div>
              <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · {dimensions.width} × {dimensions.height}px</p></div><button type="button" onClick={resetFile} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold text-zinc-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Choose another</button></div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="flex min-h-[460px] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-[linear-gradient(45deg,#f4f4f5_25%,transparent_25%),linear-gradient(-45deg,#f4f4f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f4f4f5_75%),linear-gradient(-45deg,transparent_75%,#f4f4f5_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] p-5">
                  <canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className={`block max-h-[600px] max-w-full rounded-lg object-contain shadow-xl ${mode === "convert" ? "pointer-events-none" : "cursor-crosshair touch-none"}`} />
                  {mode === "convert" && <img src={preview} alt="JPG preview" className="hidden" />}
                </div>

                <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Conversion</p>
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4"><p className="text-xs font-bold text-zinc-500">Input</p><p className="mt-1 text-sm font-extrabold">JPG / JPEG</p></div>
                  <div className="my-3 text-center text-lg font-black text-blue-600">↓</div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">Output</p><p className="mt-1 text-sm font-extrabold">PNG</p><p className="mt-1 text-xs text-zinc-500">Full working resolution</p></div>
                  <button type="button" onClick={autoErase} disabled={busy} className="mt-4 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs font-extrabold text-blue-700 shadow-sm hover:bg-blue-50 disabled:opacity-50">✂️ Remove Background</button>
                  <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setMode("erase")} className={`rounded-xl px-3 py-2.5 text-xs font-extrabold ${mode === "erase" ? "bg-blue-600 text-white" : "border border-zinc-200 bg-white"}`}>Erase Brush</button><button onClick={()=>setMode("restore")} className={`rounded-xl px-3 py-2.5 text-xs font-extrabold ${mode === "restore" ? "bg-blue-600 text-white" : "border border-zinc-200 bg-white"}`}>Restore</button></div>
                  <label className="mt-4 block text-xs font-bold">Brush size <span className="float-right text-zinc-500">{brushSize}px</span><input type="range" min="8" max="100" value={brushSize} onChange={(e)=>setBrushSize(Number(e.target.value))} className="mt-2 w-full accent-blue-600" /></label>
                  <label className="mt-4 block text-xs font-bold">Auto erase tolerance <span className="float-right text-zinc-500">{tolerance}</span><input type="range" min="10" max="80" value={tolerance} onChange={(e)=>setTolerance(Number(e.target.value))} className="mt-2 w-full accent-blue-600" /></label>
                  <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={undo} disabled={!undoRef.current.length} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-extrabold disabled:opacity-40">↶ Undo</button><button onClick={reset} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-extrabold">Reset</button></div>
                  <button type="button" onClick={convert} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,.2)] disabled:opacity-60">{busy ? "Converting…" : "Convert to PNG →"}</button>
                  {done && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold leading-5 text-emerald-800">✓ {message}</div>}
                  {message && !done && <p className="mt-3 text-[11px] leading-4 text-zinc-500">{message}</p>}
                </aside>
              </div>
            </div>
          )}
          {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✂️</span><h3 className="mt-3 text-sm font-extrabold">Background eraser</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Remove connected backgrounds before converting to PNG.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🖌️</span><h3 className="mt-3 text-sm font-extrabold">Erase & restore</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Fine-tune the result manually with both brushes.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✨</span><h3 className="mt-3 text-sm font-extrabold">Transparent PNG</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Keep transparency when you download the PNG.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image stays on your device throughout the process.</p></div></section>
      </div>
    </main>
  );
}
