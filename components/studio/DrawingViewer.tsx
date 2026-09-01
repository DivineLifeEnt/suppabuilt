"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Arrow, Text, Line, Group, RegularPolygon } from "react-konva";
import { useStudioStore, type MarkupShape } from "@/lib/store";
import { distanceBetweenPoints, pixelsToFeet, formatMeasurement, calculateScale, polygonArea } from "@/lib/scale";
import { getSymbolById, hvacSymbols } from "@/lib/hvacSymbols";

interface Props {
  fileUrl: string;
  page?: number;
}

export default function DrawingViewer({ fileUrl, page = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfSize, setPdfSize] = useState({ width: 1200, height: 900 });
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [preview, setPreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<number[]>([]);
  const [areaPoints, setAreaPoints] = useState<{ x: number; y: number }[]>([]);
  const [calPoints, setCalPoints] = useState<{ x: number; y: number }[]>([]);
  const [calDist, setCalDist] = useState("");
  const [showCalInput, setShowCalInput] = useState(false);

  const {
    tool, activePage, setTotalPages, markups, addMarkup, updateMarkup,
    selectedId, setSelectedId, activeColor, strokeWidth, zoom,
    scale, setScale, selectedEquipmentId, incrementCount, counts,
  } = useStudioStore();

  // Load PDF
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;

    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ url: fileUrl }).promise;
        setTotalPages(pdf.numPages);
        const pdfPage = await pdf.getPage(page);
        const vp = pdfPage.getViewport({ scale: 1.5 });
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = vp.width;
        canvas.height = vp.height;
        setPdfSize({ width: vp.width, height: vp.height });
        await pdfPage.render({ canvas, viewport: vp } as Parameters<typeof pdfPage.render>[0]).promise;
        if (!cancelled) setPdfLoaded(true);
      } catch {
        setPdfLoaded(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fileUrl, page, setTotalPages]);

  const stageToCanvas = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    return { x: pos.x / zoom, y: pos.y / zoom };
  };

  const handleMouseDown = (e: any) => {
    if (e.target === e.target.getStage() || e.target.getParent?.()?.className === "Layer") {
      setSelectedId(null);
    }

    if (tool === "select" || tool === "pan") return;

    const pos = stageToCanvas(e);

    if (tool === "freehand") {
      setDrawing(true);
      setFreehandPoints([pos.x, pos.y]);
      return;
    }

    if (tool === "area") {
      setAreaPoints(p => [...p, pos]);
      return;
    }

    if (tool === "calibrate") {
      setCalPoints(p => {
        const next = [...p, pos];
        if (next.length === 2) {
          setShowCalInput(true);
        }
        return next.slice(-2);
      });
      return;
    }

    if (tool === "count") {
      if (!selectedEquipmentId) return;
      const sym = getSymbolById(selectedEquipmentId);
      if (!sym) return;
      const markup: MarkupShape = {
        id: crypto.randomUUID(), type: "count", page: activePage,
        x: pos.x, y: pos.y, color: sym.color, strokeWidth: 1,
        status: "open", equipmentId: selectedEquipmentId, count: 1,
      };
      addMarkup(markup);
      incrementCount(sym.id, sym.name, sym.abbreviation, sym.color);
      return;
    }

    if (tool === "equipment") {
      if (!selectedEquipmentId) return;
      const sym = getSymbolById(selectedEquipmentId);
      if (!sym) return;
      const markup: MarkupShape = {
        id: crypto.randomUUID(), type: "equipment", page: activePage,
        x: pos.x, y: pos.y, color: sym.color, strokeWidth: 2,
        status: "open", equipmentId: selectedEquipmentId,
      };
      addMarkup(markup);
      return;
    }

    setDrawing(true);
    setStartPoint(pos);
  };

  const handleMouseMove = (e: any) => {
    if (!drawing || !startPoint) return;
    const pos = stageToCanvas(e);

    if (tool === "freehand") {
      setFreehandPoints(p => [...p, pos.x, pos.y]);
      return;
    }

    if (tool === "length") {
      setPreview({ x: startPoint.x, y: startPoint.y, width: pos.x, height: pos.y });
      return;
    }

    const x = Math.min(startPoint.x, pos.x);
    const y = Math.min(startPoint.y, pos.y);
    const width = Math.abs(pos.x - startPoint.x);
    const height = Math.abs(pos.y - startPoint.y);
    setPreview({ x, y, width, height });
  };

  const handleMouseUp = (e: any) => {
    if (!drawing || !startPoint) {
      setDrawing(false);
      return;
    }
    const pos = stageToCanvas(e);
    setDrawing(false);

    if (tool === "freehand") {
      if (freehandPoints.length > 4) {
        addMarkup({
          id: crypto.randomUUID(), type: "freehand", page: activePage,
          x: 0, y: 0, points: freehandPoints, color: activeColor, strokeWidth, status: "open",
        });
      }
      setFreehandPoints([]);
      setStartPoint(null);
      setPreview(null);
      return;
    }

    const x = Math.min(startPoint.x, pos.x);
    const y = Math.min(startPoint.y, pos.y);
    const width = Math.abs(pos.x - startPoint.x);
    const height = Math.abs(pos.y - startPoint.y);

    if (width < 5 && height < 5) {
      setStartPoint(null);
      setPreview(null);
      return;
    }

    let markup: MarkupShape | null = null;

    if (tool === "rectangle" || tool === "highlight") {
      markup = {
        id: crypto.randomUUID(), type: tool, page: activePage,
        x, y, width, height, color: activeColor, strokeWidth, status: "open",
      };
    } else if (tool === "circle") {
      markup = {
        id: crypto.randomUUID(), type: "circle", page: activePage,
        x: startPoint.x + (pos.x - startPoint.x) / 2,
        y: startPoint.y + (pos.y - startPoint.y) / 2,
        width: width / 2, height: height / 2,
        color: activeColor, strokeWidth, status: "open",
      };
    } else if (tool === "arrow") {
      markup = {
        id: crypto.randomUUID(), type: "arrow", page: activePage,
        x: startPoint.x, y: startPoint.y,
        points: [0, 0, pos.x - startPoint.x, pos.y - startPoint.y],
        color: activeColor, strokeWidth, status: "open",
      };
    } else if (tool === "text") {
      const text = window.prompt("Enter annotation text:");
      if (text) {
        markup = {
          id: crypto.randomUUID(), type: "text", page: activePage,
          x: startPoint.x, y: startPoint.y, text, color: activeColor, strokeWidth, status: "open",
        };
      }
    } else if (tool === "length") {
      const pixelDist = distanceBetweenPoints(startPoint.x, startPoint.y, pos.x, pos.y);
      const ft = scale > 0 ? pixelsToFeet(pixelDist, scale) : undefined;
      markup = {
        id: crypto.randomUUID(), type: "length", page: activePage,
        x: startPoint.x, y: startPoint.y,
        points: [0, 0, pos.x - startPoint.x, pos.y - startPoint.y],
        color: activeColor, strokeWidth, status: "open",
        measurementFt: ft,
        label: ft ? formatMeasurement(ft) : `${pixelDist.toFixed(0)}px`,
      };
    }

    if (markup) addMarkup(markup);
    setStartPoint(null);
    setPreview(null);
  };

  const handleDblClick = (e: any) => {
    if (tool === "area" && areaPoints.length >= 3) {
      const pixelArea = polygonArea(areaPoints);
      const sqFt = scale > 0 ? pixelArea * scale * scale : undefined;
      addMarkup({
        id: crypto.randomUUID(), type: "area", page: activePage,
        x: areaPoints[0].x, y: areaPoints[0].y,
        points: areaPoints.flatMap(p => [p.x, p.y]),
        color: activeColor, strokeWidth, status: "open",
        measurementFt: sqFt,
        label: sqFt ? `${sqFt.toFixed(0)} sf` : `${pixelArea.toFixed(0)}px²`,
      });
      setAreaPoints([]);
    }
  };

  const calibrate = () => {
    const ft = parseFloat(calDist);
    if (!ft || calPoints.length < 2) return;
    const pixDist = distanceBetweenPoints(calPoints[0].x, calPoints[0].y, calPoints[1].x, calPoints[1].y);
    setScale(calculateScale(pixDist, ft));
    setCalPoints([]);
    setCalDist("");
    setShowCalInput(false);
  };

  const pageMarkups = markups.filter(m => m.page === activePage);

  const getCursor = () => {
    if (tool === "pan") return "grab";
    if (tool === "select") return "default";
    return "crosshair";
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-[#323639]" style={{ cursor: getCursor() }}>
      {/* Calibration input overlay */}
      {showCalInput && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#191d21] border border-blue-500/50 rounded-lg p-4 shadow-xl flex items-center gap-3">
          <span className="text-[13px] text-gray-300">Known distance (feet):</span>
          <input
            autoFocus
            type="number"
            value={calDist}
            onChange={e => setCalDist(e.target.value)}
            onKeyDown={e => e.key === "Enter" && calibrate()}
            className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-[13px] focus:outline-none"
            placeholder="e.g. 10"
          />
          <button onClick={calibrate} className="px-3 py-1 bg-blue-500 text-white text-[12px] rounded hover:bg-blue-600">Set Scale</button>
          <button onClick={() => { setShowCalInput(false); setCalPoints([]); }} className="text-gray-500 hover:text-white text-sm">✕</button>
        </div>
      )}

      {/* Scale indicator */}
      {scale > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/60 px-3 py-1.5 rounded text-[11px] text-green-400 font-mono">
          Scale: 1px = {(scale * 12).toFixed(3)}"
        </div>
      )}

      <div className="relative mx-auto" style={{ width: pdfSize.width * zoom, height: pdfSize.height * zoom }}>
        {/* PDF canvas */}
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", top: 0, left: 0, width: pdfSize.width * zoom, height: pdfSize.height * zoom }}
        />

        {!pdfLoaded && !fileUrl.startsWith("data:") && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading drawing...</p>
            </div>
          </div>
        )}

        {/* Konva markup stage */}
        <Stage
          width={pdfSize.width * zoom}
          height={pdfSize.height * zoom}
          scaleX={zoom}
          scaleY={zoom}
          style={{ position: "absolute", top: 0, left: 0 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDblClick={handleDblClick}
        >
          <Layer>
            {/* Render saved markups */}
            {pageMarkups.map((m) => (
              <MarkupRenderer key={m.id} markup={m} selected={m.id === selectedId} onSelect={setSelectedId} zoom={zoom} />
            ))}

            {/* Calibration points */}
            {calPoints.map((p, i) => (
              <Circle key={i} x={p.x} y={p.y} radius={5} fill="cyan" stroke="white" strokeWidth={1} />
            ))}
            {calPoints.length === 2 && (
              <Line points={[calPoints[0].x, calPoints[0].y, calPoints[1].x, calPoints[1].y]} stroke="cyan" strokeWidth={1} dash={[5, 3]} />
            )}

            {/* Area in-progress points */}
            {areaPoints.length > 0 && (
              <>
                <Line
                  points={areaPoints.flatMap(p => [p.x, p.y])}
                  stroke={activeColor} strokeWidth={strokeWidth} dash={[5, 3]}
                />
                {areaPoints.map((p, i) => (
                  <Circle key={i} x={p.x} y={p.y} radius={4} fill={activeColor} />
                ))}
              </>
            )}

            {/* Preview shapes */}
            {preview && drawing && (() => {
              if (tool === "rectangle" || tool === "highlight") {
                return <Rect x={preview.x} y={preview.y} width={preview.width} height={preview.height}
                  stroke={activeColor} strokeWidth={strokeWidth} dash={[5, 3]}
                  fill={tool === "highlight" ? activeColor + "33" : "transparent"} />;
              }
              if (tool === "circle") {
                return <Circle x={preview.x + preview.width / 2} y={preview.y + preview.height / 2}
                  radiusX={preview.width / 2} radiusY={preview.height / 2}
                  stroke={activeColor} strokeWidth={strokeWidth} dash={[5, 3]} />;
              }
              if (tool === "arrow" || tool === "length") {
                return <Arrow points={[preview.x, preview.y, preview.width, preview.height]}
                  stroke={activeColor} strokeWidth={strokeWidth} fill={activeColor} dash={[5, 3]} pointerLength={8} pointerWidth={6} />;
              }
              return null;
            })()}

            {/* Freehand preview */}
            {tool === "freehand" && freehandPoints.length > 2 && (
              <Line points={freehandPoints} stroke={activeColor} strokeWidth={strokeWidth} tension={0.3} lineCap="round" />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

function MarkupRenderer({ markup: m, selected, onSelect, zoom }: {
  markup: MarkupShape;
  selected: boolean;
  onSelect: (id: string) => void;
  zoom: number;
}) {
  const opacity = m.status === "void" ? 0.2 : m.status === "resolved" ? 0.5 : 1;
  const props = {
    onClick: (e: any) => { e.cancelBubble = true; onSelect(m.id); },
    opacity,
    stroke: selected ? "#60A5FA" : m.color,
    strokeWidth: selected ? m.strokeWidth + 1 : m.strokeWidth,
    draggable: true,
  };

  if (m.type === "rectangle") {
    return <Rect {...props} x={m.x} y={m.y} width={m.width!} height={m.height!} fill="transparent" />;
  }
  if (m.type === "highlight") {
    return <Rect {...props} x={m.x} y={m.y} width={m.width!} height={m.height!} fill={m.color + "44"} strokeWidth={0} />;
  }
  if (m.type === "circle") {
    return <Circle {...props} x={m.x} y={m.y} radiusX={m.width!} radiusY={m.height!} fill="transparent" />;
  }
  if (m.type === "arrow" || m.type === "length") {
    return (
      <Group x={m.x} y={m.y} onClick={(e: any) => { e.cancelBubble = true; onSelect(m.id); }} opacity={opacity} draggable>
        <Arrow points={m.points!} stroke={selected ? "#60A5FA" : m.color} strokeWidth={m.strokeWidth} fill={m.color}
          pointerLength={8} pointerWidth={6} />
        {m.label && (
          <Text text={m.label} x={(m.points![0] + m.points![2]) / 2} y={(m.points![1] + m.points![3]) / 2 - 14}
            fill="white" fontSize={11} fontStyle="bold"
            offsetX={m.label.length * 3}
            padding={2} />
        )}
      </Group>
    );
  }
  if (m.type === "freehand") {
    return <Line {...props} points={m.points!} tension={0.3} lineCap="round" fill="transparent" />;
  }
  if (m.type === "area") {
    return (
      <Group x={m.x} y={m.y} onClick={(e: any) => { e.cancelBubble = true; onSelect(m.id); }} opacity={opacity} draggable>
        <Line
          points={m.points!.map((v, i) => i % 2 === 0 ? v - m.x : v - m.y)}
          closed fill={m.color + "22"} stroke={selected ? "#60A5FA" : m.color} strokeWidth={m.strokeWidth} />
        {m.label && (
          <Text text={m.label} x={0} y={-14} fill="white" fontSize={11} fontStyle="bold" padding={2} />
        )}
      </Group>
    );
  }
  if (m.type === "text") {
    return <Text {...props} x={m.x} y={m.y} text={m.text!} fill={m.color} fontSize={14} fontStyle="bold" stroke={undefined} />;
  }
  if (m.type === "cloud") {
    return <Rect {...props} x={m.x} y={m.y} width={m.width || 80} height={m.height || 40} cornerRadius={12} fill={m.color + "22"} />;
  }
  if (m.type === "count" || m.type === "equipment") {
    const sym = m.equipmentId ? getSymbolById(m.equipmentId) : null;
    return (
      <Group x={m.x} y={m.y} onClick={(e: any) => { e.cancelBubble = true; onSelect(m.id); }} opacity={opacity} draggable>
        <RegularPolygon sides={4} radius={14} rotation={45} fill={m.color + "44"} stroke={selected ? "#60A5FA" : m.color} strokeWidth={selected ? 2 : 1.5} />
        {sym && <Text text={sym.abbreviation.slice(0, 3)} x={-10} y={-6} fill="white" fontSize={8} fontStyle="bold" width={20} align="center" />}
      </Group>
    );
  }
  return null;
}
