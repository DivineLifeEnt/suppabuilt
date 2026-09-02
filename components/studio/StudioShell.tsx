"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { FitMode, PageInfo, PlanRecord } from "@/types/plan";
import { formatBytes, formatDimensions } from "@/lib/format";
import { useStudioStore } from "@/lib/store";
import StudioToolbar from "./StudioToolbar";
import MarkupPanel from "./MarkupPanel";
import DrawingNavigator from "./DrawingNavigator";
import { MarkupLayer } from "@/components/markup/MarkupLayer";
import { MarkupSaveStatus } from "@/components/markup/MarkupSaveStatus";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;

export function StudioShell() {
  const [plan, setPlan] = useState<PlanRecord | null>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState<FitMode>("page");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const { setTotalPages, setPage: setStorePage, setZoom: setStoreZoom } = useStudioStore();

  const loadPdf = useCallback(async (source: string | ArrayBuffer) => {
    setLoading(true);
    setError(null);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const src = typeof source === "string" ? { url: source } : { data: source };
      const document = await pdfjs.getDocument(src).promise;
      setPdf(document);
      setTotalPages(document.numPages);
      setPage(1);
      setStorePage(1);
      setRotation(0);
      setFit("page");
    } catch (cause) {
      console.error(cause);
      setError("This PDF could not be opened. It may be damaged, encrypted, or unsupported.");
    } finally {
      setLoading(false);
    }
  }, [setTotalPages, setStorePage]);

  const openLocal = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Choose a PDF plan set."); return; }
    setUploadProgress(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/plans", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setPlan(data as PlanRecord);
      await loadPdf((data as PlanRecord).url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The plan could not be uploaded.");
    } finally {
      setUploadProgress(false);
    }
  }, [loadPdf]);

  const changeZoom = useCallback((value: number) => {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
    setFit("custom");
    setZoom(z);
    setStoreZoom(z);
  }, [setStoreZoom]);

  const applyFit = useCallback(async (mode: Exclude<FitMode, "custom">) => {
    if (!pdf || !viewportRef.current) return;
    const current = await pdf.getPage(page);
    const base = current.getViewport({ scale: 1, rotation });
    const area = viewportRef.current;
    const aw = Math.max(240, area.clientWidth - 64);
    const ah = Math.max(240, area.clientHeight - 64);
    const z = mode === "width" ? aw / base.width : Math.min(aw / base.width, ah / base.height);
    setZoom(z);
    setStoreZoom(z);
    setFit(mode);
  }, [pdf, page, rotation, setStoreZoom]);

  useEffect(() => {
    if (pdf && fit !== "custom") applyFit(fit);
  }, [pdf, page, rotation, fit, applyFit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "=", "-"].includes(e.key)) {
        e.preventDefault();
        changeZoom(zoom + (e.key === "-" ? -ZOOM_STEP : ZOOM_STEP));
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        const next = Math.min(pdf?.numPages ?? 1, page + 1);
        setPage(next); setStorePage(next);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        const prev = Math.max(1, page - 1);
        setPage(prev); setStorePage(prev);
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        setRotation(v => (v + 90) % 360);
      } else if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); applyFit("page");
      } else if (e.key === "Escape") { setRailOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyFit, changeZoom, pdf?.numPages, zoom, page, setStorePage]);

  return (
    <main className="studio-grid" style={{ gridTemplateColumns: "188px 1fr auto" }}>
      {/* Top bar */}
      <header className="topbar flex min-w-0 items-center gap-2 border-b border-[#27313c] bg-[#0c1117] px-3">
        <button className="tool-button md:hidden" onClick={() => setRailOpen(v => !v)}>☰</button>
        <div className="flex shrink-0 items-center gap-2 pr-2">
          <div className="grid size-8 place-items-center rounded-md bg-[#ff6a1a] text-white shadow-[0_0_22px_#ff6a1a40] text-lg">⚡</div>
          <div className="leading-none">
            <div className="text-[13px] font-bold tracking-[.12em]">SUPPABUILT</div>
            <div className="mt-0.5 text-[9px] font-bold tracking-[.28em] text-[#ff7a32]">STUDIO</div>
          </div>
        </div>
        <div className="separator desktop-only" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold text-[#e9edf1]">{plan?.name ?? "No plan set open"}</div>
          <div className="truncate text-[10px] text-[#778493]">{plan ? "Local storage" : "Upload a drawing to begin"}</div>
        </div>
        {pdf && (
          <>
            <div className="desktop-only flex items-center gap-1 rounded-md border border-[#2a3540] bg-[#111820] p-0.5">
              <button className="tool-button !h-7 !min-w-7" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); setStorePage(p); }}>‹</button>
              <label className="flex items-center gap-1 text-[11px] text-[#8895a2]">
                <input className="h-6 w-9 rounded border border-[#364250] bg-[#080c11] text-center text-white"
                  value={page} onChange={e => { const p = Math.min(pdf.numPages, Math.max(1, Number(e.target.value) || 1)); setPage(p); setStorePage(p); }} />
                / {pdf.numPages}
              </label>
              <button className="tool-button !h-7 !min-w-7" disabled={page >= pdf.numPages} onClick={() => { const p = page + 1; setPage(p); setStorePage(p); }}>›</button>
            </div>
            <div className="separator desktop-only" />
            <div className="desktop-only flex items-center">
              <button className="tool-button" onClick={() => changeZoom(zoom - ZOOM_STEP)}>−</button>
              <span className="w-12 text-center font-mono text-[11px] text-[#bdc6ce]">{Math.round(zoom * 100)}%</span>
              <button className="tool-button" onClick={() => changeZoom(zoom + ZOOM_STEP)}>+</button>
              <button className={`tool-button !px-2 ${fit === "width" ? "active" : ""}`} onClick={() => applyFit("width")}>Width</button>
              <button className={`tool-button !px-2 ${fit === "page" ? "active" : ""}`} onClick={() => applyFit("page")}>Fit</button>
              <button className="tool-button" onClick={() => setRotation(v => (v + 90) % 360)}>↻</button>
            </div>
          </>
        )}
        <button
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-[#ff6a1a] px-3 text-[11px] font-bold text-white hover:bg-[#ff7b34] transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {uploadProgress ? <span className="animate-spin">⟳</span> : "↑"}
          <span className="desktop-only">{plan ? "Open another" : "Upload plan"}</span>
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={e => e.target.files?.[0] && openLocal(e.target.files[0])} />
      </header>

      {/* Markup toolbar */}
      {pdf && (
        <div className="toolbar-row">
          <StudioToolbar />
        </div>
      )}

      {/* Left rail — thumbnails */}
      <aside className={`thumbnail-rail flex min-h-0 flex-col border-r border-[#26313c] bg-[#0d131a] ${railOpen ? "open" : ""}`}>
        <div className="flex h-10 items-center justify-between border-b border-[#222c36] px-3">
          <span className="text-[10px] font-bold tracking-[.14em] text-[#8e9aa6]">SHEETS {pdf ? `· ${pdf.numPages}` : ""}</span>
          <button className="tool-button !h-7 !min-w-7 md:hidden" onClick={() => setRailOpen(false)}>✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {pdf ? (
            Array.from({ length: pdf.numPages }, (_, i) => (
              <Thumbnail key={i + 1} pdf={pdf} pageNumber={i + 1} active={page === i + 1}
                onClick={() => { setPage(i + 1); setStorePage(i + 1); setRailOpen(false); }} />
            ))
          ) : (
            <div className="grid h-full place-items-center px-4 text-center text-[11px] leading-5 text-[#64717e]">
              <div>📄<p className="mt-3">Sheet thumbnails appear here after upload.</p></div>
            </div>
          )}
        </div>
      </aside>

      {/* Main canvas */}
      <section ref={viewportRef} className="canvas-grid relative min-h-0 min-w-0 overflow-auto">
        {error && (
          <div role="alert" className="absolute left-1/2 top-5 z-20 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3 rounded-lg border border-[#763d2a] bg-[#281711]/95 px-4 py-3 text-sm shadow-2xl">
            ⚠️ <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-gray-400 hover:text-white">✕</button>
          </div>
        )}
        {loading ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-40 w-28 rounded skeleton" />
              <div className="flex items-center justify-center gap-2 text-xs text-[#95a1ac]">
                <span className="animate-spin text-[#ff6a1a]">⟳</span> Preparing drawing set…
              </div>
            </div>
          </div>
        ) : pdf ? (
          <div className="flex min-h-full min-w-full items-center justify-center p-8">
            <PdfPageWithMarkup pdf={pdf} pageNumber={page} scale={zoom} rotation={rotation} onInfo={setPageInfo} />
          </div>
        ) : (
          <EmptyState uploading={uploadProgress} onUpload={() => inputRef.current?.click()} onLocal={openLocal} />
        )}
      </section>

      {/* Right panel — markups */}
      {pdf && <MarkupPanel />}

      {/* Status bar */}
      <footer className="statusbar flex items-center gap-4 border-t border-[#26313c] bg-[#0b1016] px-3 text-[10px] text-[#73808c]">
        <span className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${pdf ? "bg-[#49c176]" : "bg-[#64717e]"}`} />
          {pdf ? "Document ready" : "Ready"}
        </span>
        {plan && <span>{formatBytes(plan.size)}</span>}
        {pageInfo && <span className="desktop-only">{formatDimensions(pageInfo.width, pageInfo.height)} · {rotation}°</span>}
        {pdf && <MarkupSaveStatus />}
        <span className="ml-auto desktop-only text-[#556370]">← → pages · Ctrl +/− zoom · Ctrl 0 fit · R rotate · V select · P pen</span>
        {pdf && <span className="md:hidden">Sheet {page} / {pdf.numPages} · {Math.round(zoom * 100)}%</span>}
      </footer>
    </main>
  );
}

function EmptyState({ uploading, onUpload, onLocal }: { uploading: boolean; onUpload: () => void; onLocal: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div className="grid h-full place-items-center p-5">
      <div className="w-full max-w-[620px]">
        <div className="mb-7 text-center">
          <div className="mb-2 text-[11px] font-bold tracking-[.2em] text-[#ff7a32]">HVAC CONSTRUCTION STUDIO</div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl">Plans, markups, takeoffs.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8d99a5]">
            Upload a PDF plan set and start marking up drawings, measuring ducts and linesets, counting equipment — all in one place.
          </p>
        </div>
        <button
          onClick={onUpload}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onLocal(f); }}
          className={`group w-full rounded-xl border border-dashed p-10 text-center transition ${
            dragging ? "border-[#ff6a1a] bg-[#ff6a1a]/10" : "border-[#3b4652] bg-[#10171f]/85 hover:border-[#596675] hover:bg-[#141d26]"
          }`}
        >
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-lg border border-[#394552] bg-[#1a232d] text-[#ff7a32] text-2xl group-hover:scale-105 transition-transform">
            📂
          </div>
          <div className="text-sm font-semibold text-white">{uploading ? "Uploading plan set…" : "Drop a PDF plan set here"}</div>
          <div className="mt-2 text-[11px] text-[#74818e]">or click to browse · PDF up to 100 MB</div>
        </button>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "📐", label: "Measure", desc: "Calibrate scale, measure ducts, linesets, area" },
            { icon: "✏️", label: "Markup", desc: "Annotate with text, clouds, arrows, shapes" },
            { icon: "⚙️", label: "Count", desc: "Tag and count HVAC equipment by type" },
          ].map(item => (
            <div key={item.label} className="rounded-lg bg-white/3 border border-white/5 p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-[12px] font-semibold text-white">{item.label}</div>
              <div className="text-[10px] text-[#64717e] mt-1 leading-4">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PdfPageWithMarkup({ pdf, pageNumber, scale, rotation, onInfo }: {
  pdf: PDFDocumentProxy; pageNumber: number; scale: number; rotation: number; onInfo: (i: PageInfo) => void; planId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | undefined;
    (async () => {
      setLoaded(false);
      const current = await pdf.getPage(pageNumber);
      const base = current.getViewport({ scale: 1, rotation });
      const viewport = current.getViewport({ scale, rotation });
      onInfo({ pageNumber, width: base.width, height: base.height, rotation });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });
      if (cancelled) return;
      renderTask = current.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] } as Parameters<typeof current.render>[0]);
      await renderTask.promise;
      if (!cancelled) setLoaded(true);
    })().catch(cause => { if (cause?.name !== "RenderingCancelledException") console.error(cause); });
    return () => { cancelled = true; renderTask?.cancel(); };
  }, [pdf, pageNumber, scale, rotation, onInfo]);

  return (
    <div className="relative" style={{ width: size.width, height: size.height }}>
      <canvas ref={canvasRef} className="pdf-page block absolute inset-0" />
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-white/80">
          <span className="animate-spin text-[#ff6a1a] text-2xl">⟳</span>
        </div>
      )}
      {loaded && (
        <MarkupLayer
          planId="local"
          pageNumber={pageNumber}
          pageWidth={size.width}
          pageHeight={size.height}
          zoom={scale}
          rotation={rotation}
          canvasRef={canvasRef}
        />
      )}
    </div>
  );
}

function Thumbnail({ pdf, pageNumber, active, onClick }: { pdf: PDFDocumentProxy; pageNumber: number; active: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: ReturnType<PDFPageProxy["render"]> | undefined;
    let disposed = false;
    (async () => {
      const p = await pdf.getPage(pageNumber);
      const base = p.getViewport({ scale: 1 });
      const viewport = p.getViewport({ scale: 132 / base.width });
      const canvas = canvasRef.current;
      if (!canvas || disposed) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = p.render({ canvas, viewport } as Parameters<typeof p.render>[0]);
      await task.promise;
    })().catch(() => {});
    return () => { disposed = true; task?.cancel(); };
  }, [pdf, pageNumber]);

  return (
    <button onClick={onClick}
      className={`mb-2 w-full rounded-md border p-2 text-left transition ${
        active ? "border-[#ff6a1a] bg-[#ff6a1a]/8 shadow-[0_0_0_1px_#ff6a1a33]" : "border-transparent hover:border-[#35414d] hover:bg-[#151d25]"
      }`}>
      <canvas ref={canvasRef} className="mx-auto max-h-40 max-w-full bg-white shadow-md" />
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[10px] font-semibold ${active ? "text-[#ff7a32]" : "text-[#98a4af]"}`}>
          SHEET {String(pageNumber).padStart(2, "0")}
        </span>
        {active && <span className="size-1.5 rounded-full bg-[#ff6a1a]" />}
      </div>
    </button>
  );
}
