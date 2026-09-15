"use client";

import { useRef, useState } from "react";

type Bbox={x0:number;y0:number;x1:number;y1:number};
type OcrWord={text:string;confidence:number;bbox:Bbox};
type OcrLine={text:string;confidence:number;bbox:Bbox;words:OcrWord[]};
type OcrParagraph={text:string;confidence:number;bbox:Bbox;lines:OcrLine[]};
type OcrBlock={text:string;confidence:number;bbox:Bbox;paragraphs:OcrParagraph[];blocktype?:string};
type OcrResult={text:string;confidence?:number;blocks?:OcrBlock[]};
type OcrOptions={logger?:(message:{status?:string;progress?:number})=>void;config?:Record<string,string>;output?:Record<string,boolean>};
type TesseractApi={recognize:(image:File|HTMLCanvasElement,language:string,options?:OcrOptions)=>Promise<{data:OcrResult}>};

declare global{interface Window{Tesseract?:TesseractApi}}
let tesseractPromise:Promise<TesseractApi>|null=null;

function loadTesseract(){
  if(typeof window==="undefined")return Promise.reject(new Error("OCR is only available in a browser."));
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  if(tesseractPromise)return tesseractPromise;
  tesseractPromise=new Promise<TesseractApi>((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>('script[data-makeudocs-tesseract]');
    if(existing){existing.addEventListener("load",()=>window.Tesseract?resolve(window.Tesseract):reject(new Error("OCR engine could not be loaded.")),{once:true});existing.addEventListener("error",()=>reject(new Error("OCR engine could not be loaded.")),{once:true});return}
    const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";script.async=true;script.dataset.makeudocsTesseract="true";
    script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error("OCR engine could not be loaded."));script.onerror=()=>reject(new Error("Could not load the OCR engine. Check your internet connection and try again."));document.head.appendChild(script);
  });return tesseractPromise;
}

async function buildOcrCanvases(file:File){
  const bitmap=await createImageBitmap(file),w=bitmap.width,h=bitmap.height,scale=Math.min(3,Math.max(1.5,2400/Math.max(w,h)));
  const make=()=>{const c=document.createElement("canvas");c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));return c};
  const original=make(),enhanced=make(),a=original.getContext("2d"),b=enhanced.getContext("2d",{willReadFrequently:true});
  if(!a||!b){bitmap.close();throw new Error("Your browser could not create an OCR canvas.")}
  a.imageSmoothingEnabled=b.imageSmoothingEnabled=true;a.imageSmoothingQuality=b.imageSmoothingQuality="high";a.drawImage(bitmap,0,0,original.width,original.height);b.drawImage(bitmap,0,0,enhanced.width,enhanced.height);bitmap.close();
  const image=b.getImageData(0,0,enhanced.width,enhanced.height),d=image.data;
  for(let i=0;i<d.length;i+=4){const gray=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=Math.max(0,Math.min(255,(gray-128)*1.35+128));d[i]=d[i+1]=d[i+2]=v}
  b.putImageData(image,0,0);return{original,enhanced};
}

function clean(value:string){return value.replace(/[\t ]+/g," ").replace(/ +$/gm,"").replace(/^ +/gm,"").replace(/\n{3,}/g,"\n\n").trim()}
function useful(value:string){return /[A-Za-z0-9\u0900-\u097F\u0C00-\u0C7F]/u.test(value)}
function deDuplicateToken(token:string){
  const t=token.trim();
  if(t.length>=4&&t.length%2===0){const half=t.length/2;if(t.slice(0,half).toLowerCase()===t.slice(half).toLowerCase())return t.slice(0,half)}
  return t;
}
function cleanLine(value:string){
  const tokens=value.split(/\s+/).map(deDuplicateToken).filter(useful);
  const out:string[]=[];
  for(const token of tokens){const prev=out[out.length-1];if(prev&&prev.toLowerCase()===token.toLowerCase())continue;out.push(token)}
  return out.join(" ");
}
function blockText(block:OcrBlock){
  const paragraphs=(block.paragraphs||[]).filter(p=>(p.confidence??0)>=30||p.text?.trim());
  const lines:string[]=[];
  for(const paragraph of paragraphs){
    for(const line of paragraph.lines||[]){
      const text=cleanLine(line.text||((line.words||[]).map(w=>w.text).join(" ")));
      if(text)lines.push(text);
    }
    if(paragraph.lines?.length)lines.push("");
  }
  return clean(lines.join("\n"));
}
function structuredBlocks(data:OcrResult){
  const blocks=(data.blocks||[]).filter(b=>b.bbox&&useful(b.text||"")&&(b.confidence??0)>=25).map((b,i)=>({b,i,text:blockText(b),x:b.bbox.x0,y:b.bbox.y0})).filter(x=>x.text);
  if(!blocks.length)return clean(data.text||"");
  // Tesseract's block hierarchy already represents text regions. Preserve that
  // order instead of rebuilding every word into artificial lines; this avoids
  // mixing a paragraph with a logo or another column at the same Y position.
  const ordered=[...blocks].sort((a,b)=>a.y-b.y||a.x-b.x);
  const result:string[]=[];
  for(const item of ordered){
    const previous=result[result.length-1];
    if(previous&&previous.toLowerCase()===item.text.toLowerCase())continue;
    result.push(item.text);
  }
  return clean(result.join("\n\n"));
}

export default function OcrPage(){
  const inputRef=useRef<HTMLInputElement>(null);const[file,setFile]=useState<File|null>(null);const[preview,setPreview]=useState("");const[language,setLanguage]=useState("eng");const[text,setText]=useState("");const[confidence,setConfidence]=useState<number|null>(null);const[progress,setProgress]=useState(0);const[status,setStatus]=useState("");const[busy,setBusy]=useState(false);const[dragging,setDragging]=useState(false);const[error,setError]=useState("");
  const choose=(next?:File)=>{if(!next)return;if(!next.type.startsWith("image/")){setError("Please select an image file.");return}if(preview)URL.revokeObjectURL(preview);setFile(next);setPreview(URL.createObjectURL(next));setText("");setConfidence(null);setProgress(0);setStatus("");setError("")};
  const runOcr=async()=>{if(!file)return;setBusy(true);setError("");setText("");setConfidence(null);setProgress(0);setStatus("Preparing text-region OCR…");try{const tesseract=await loadTesseract();const{original,enhanced}=await buildOcrCanvases(file);let last=0;const recognize=(canvas:HTMLCanvasElement,label:string,offset:number)=>tesseract.recognize(canvas,language,{config:{tessedit_pageseg_mode:"11",preserve_interword_spaces:"1"},output:{blocks:true},logger:m=>{if(typeof m.progress==="number"){const p=Math.round(offset+m.progress*50);if(p>last){last=p;setProgress(p)}}if(m.status)setStatus(`${label}: ${m.status.replace(/_/g," ")}`)}});const[first,second]=await Promise.all([recognize(original,"Original pass",0),recognize(enhanced,"Enhanced pass",50)]);const candidates=[first.data,second.data].map(d=>({text:structuredBlocks(d),raw:clean(d.text||""),confidence:typeof d.confidence==="number"?d.confidence:0})).filter(x=>x.text);if(!candidates.length){setText("No readable text was detected. Try a sharper image, better lighting, or crop closer to the text.");setStatus("No readable text detected.")}else{candidates.sort((a,b)=>(b.confidence-a.confidence)*3+(b.text.length-a.text.length)/1000);const best=candidates[0];setText(best.text||best.raw);setConfidence(best.confidence);setStatus("Text extracted from detected text regions with cleaner reading order.")}setProgress(100)}catch(err){setError(err instanceof Error?err.message:"OCR could not process this image.");setStatus("")}finally{setBusy(false)}};
  const copyText=async()=>{if(!text)return;await navigator.clipboard.writeText(text);setStatus("Text copied to clipboard.")};
  const downloadText=()=>{if(!text)return;const blob=new Blob([text],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`${file?.name.replace(/\.[^.]+$/i,"")||"ocr-result"}.txt`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  const reset=()=>{if(preview)URL.revokeObjectURL(preview);setFile(null);setPreview("");setText("");setConfidence(null);setProgress(0);setStatus("");setError("");if(inputRef.current)inputRef.current.value=""};
  return <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-6 sm:py-12"><div className="mx-auto max-w-6xl"><div className="mx-auto max-w-3xl text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl shadow-sm">🔎</div><p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">MakeUdocs AI Tools</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">OCR</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-500">Extract text from images with text-region recognition directly in your browser. Nothing is uploaded to MakeUdocs.</p></div><section className="mt-9 rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,.07)] sm:p-7">{!file?<label onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);choose(e.dataTransfer.files?.[0])}} className={`flex min-h-[330px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${dragging?"border-blue-500 bg-blue-50":"border-zinc-300 bg-gradient-to-b from-white to-slate-50 hover:border-blue-300"}`}><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>choose(e.target.files?.[0])}/><span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-blue-50 text-4xl shadow-sm">📄</span><h2 className="mt-6 text-xl font-extrabold">Drop an image here</h2><p className="mt-2 text-sm text-zinc-500">JPG, PNG, WebP and other browser-supported images</p><span className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-lg">Choose Image →</span><p className="mt-4 text-xs font-semibold text-zinc-400">Free · Browser-local OCR</p></label>:<div><div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{file.name}</p><p className="mt-1 text-xs text-zinc-500">{(file.size/1024/1024).toFixed(2)} MB</p></div><button type="button" onClick={reset} disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Choose another</button></div><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]"><div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 p-5"><img src={preview} alt="OCR source preview" className="mx-auto max-h-[600px] max-w-full rounded-lg object-contain shadow-xl"/></div><aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">OCR settings</p><label className="mt-4 block text-xs font-extrabold">Language<select value={language} onChange={e=>setLanguage(e.target.value)} disabled={busy} className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-blue-500"><option value="eng">English</option><option value="hin">Hindi</option><option value="tel">Telugu</option></select></label><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><strong>Text-region mode:</strong> MakeUdocs uses Tesseract's detected text blocks and their line hierarchy instead of rebuilding every word by raw coordinates.</div><button type="button" onClick={runOcr} disabled={busy} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?`Extracting ${progress}%…`:"Extract Text →"}</button>{busy&&<div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div><p className="mt-2 text-xs text-zinc-500">{status||"Processing image…"}</p></div>}{!busy&&status&&<p className="mt-3 text-xs font-semibold text-emerald-700">✓ {status}</p>}{confidence!==null&&<div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-bold text-blue-600">OCR confidence</p><p className="mt-1 text-lg font-extrabold">{Math.round(confidence)}%</p></div>}</aside></div>{text&&<div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Extracted text</p><p className="mt-1 text-xs text-zinc-400">Review the result before using it.</p></div><div className="flex gap-2"><button type="button" onClick={copyText} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-extrabold shadow-sm">Copy</button><button type="button" onClick={downloadText} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm">Download TXT</button></div></div><textarea value={text} onChange={e=>setText(e.target.value)} className="mt-4 min-h-[260px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 outline-none focus:border-blue-500" spellCheck={false}/></div>}</div>}{error&&<div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">{error}</div>}</section><section className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">📝</span><h3 className="mt-3 text-sm font-extrabold">Extract text</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Turn text in photos and scanned images into editable text.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">✨</span><h3 className="mt-3 text-sm font-extrabold">Text-region recognition</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Use detected blocks and line hierarchy to keep complex poster text in a more natural order.</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><span className="text-xl">🔒</span><h3 className="mt-3 text-sm font-extrabold">Private by design</h3><p className="mt-1 text-xs leading-5 text-zinc-500">Your image is processed in your browser rather than uploaded to MakeUdocs.</p></div></section></div></main>;
}
