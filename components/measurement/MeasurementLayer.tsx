"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import type { Calibration, MeasurementTool } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";
import { screenToNormalized } from "@/lib/markup/geometry";
import { useMeasurementStore } from "@/stores/measurementStore";
import { generateSnapCandidates, findBestSnap } from "@/lib/measurement/snapping";
import { constrainAngle } from "@/lib/measurement/geometry";
import { DEFAULT_MEASUREMENT_STYLE } from "@/lib/measurement/types";
import { formatMeasurementQuantity } from "@/lib/measurement/formatting";
import { validateArea } from "@/lib/measurement/validation";
import { MeasurementRenderer } from "./MeasurementRenderer";
import { MeasurementDraft } from "./MeasurementDraft";
import { SnapIndicator } from "./SnapIndicator";
import { VertexHandles } from "./VertexHandles";

// ─── Types ────────────────────────────────────────────────────────────────────
type PointerPos = NormalizedPoint | null;

interface Props {
  planId: string;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  zoom: number;
  rotation: number;
  calibration: Calibration | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRequestCalibrate?: () => void;
}

// Tools that use single click-to-place workflow
const CLICK_TOOLS: MeasurementTool[] = ["count"];
// Tools that use two-point click workflow
const TWO_POINT_TOOLS: MeasurementTool[] = ["linear", "calibrate", "diameter", "radius"];
// Tools that use vertex workflow (multi-click, double-click/Enter to finish)
const VERTEX_TOOLS: MeasurementTool[] = ["polyline", "perimeter", "polygon-area", "rectangle-area", "volume", "angle"];

const SHIFT_SNAP_ANGLE = 45;

export function MeasurementLayer({
  planId,
  pageNumber,
  pageWidth,
  pageHeight,
  zoom,
  rotation,
  calibration,
  canvasRef,
  onRequestCalibrate,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [currentPointer, setCurrentPointer] = useState<PointerPos>(null);
  const [, setAngleConstrain] = useState(false);

  const {
    measurements,
    activeTool,
    draftPoints,
    selectedIds,
    snapSettings,
    snapCandidate,
    addMeasurement,
    deleteMeasurement,
    setDraftPoints,
    addDraftPoint,
    removeLastDraftPoint,
    clearDraft,
    setSelectedIds,
    selectOne,
    setSnapCandidate,
    setSaveState,
    loadMeasurements,
    loadCalibrations,
  } = useMeasurementStore();

  // ── Sync SVG size with canvas ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => {
      setSize({ width: canvas.offsetWidth, height: canvas.offsetHeight });
    });
    obs.observe(canvas);
    setSize({ width: canvas.offsetWidth, height: canvas.offsetHeight });
    return () => obs.disconnect();
  }, [canvasRef]);

  // ── Load measurements from API ────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`/api/plans/${planId}/measurements?page=${pageNumber}`).then((r) => r.json()),
      fetch(`/api/plans/${planId}/calibrations`).then((r) => r.json()),
    ]).then(([mData, cData]) => {
      const md = mData as { measurements?: import("@/lib/measurement/types").Measurement[] };
      const cd = cData as { calibrations?: Calibration[] };
      if (md.measurements) loadMeasurements(md.measurements);
      if (cd.calibrations) loadCalibrations(cd.calibrations);
    }).catch(() => {});
  }, [planId, pageNumber, loadMeasurements, loadCalibrations]);

  // ── Coordinate helper ─────────────────────────────────────────────────────
  const toNorm = useCallback(
    (e: PointerEvent | React.PointerEvent): NormalizedPoint | null => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return screenToNormalized(
        { x: e.clientX, y: e.clientY },
        rect, zoom, rotation, pageWidth, pageHeight
      );
    },
    [canvasRef, zoom, rotation, pageWidth, pageHeight]
  );

  // ── Snap helper ───────────────────────────────────────────────────────────
  const pageMeasurements = useMemo(
    () => Object.values(measurements).filter((m) => m.pageNumber === pageNumber),
    [measurements, pageNumber]
  );

  const snapCandidates = useMemo(
    () => generateSnapCandidates(pageMeasurements, calibration, pageWidth, pageHeight),
    [pageMeasurements, calibration, pageWidth, pageHeight]
  );

  const applySnap = useCallback(
    (pt: NormalizedPoint, shift: boolean): NormalizedPoint => {
      // Angle constraint takes priority when Shift held
      if (shift && draftPoints.length > 0) {
        const origin = draftPoints[draftPoints.length - 1];
        return constrainAngle(origin, pt, SHIFT_SNAP_ANGLE);
      }

      if (!snapSettings.enabled) {
        setSnapCandidate(null);
        return pt;
      }

      const best = findBestSnap(pt, snapCandidates, snapSettings.tolerancePx, zoom, pageWidth, pageHeight);
      setSnapCandidate(best);
      return best?.point ?? pt;
    },
    [draftPoints, snapSettings, snapCandidates, zoom, pageWidth, pageHeight, setSnapCandidate]
  );

  // ── Save helper ───────────────────────────────────────────────────────────
  const saveMeasurement = useCallback(
    async (m: import("@/lib/measurement/types").Measurement) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/plans/${planId}/measurements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(m),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    },
    [planId, setSaveState]
  );

  // ── RAF pointer coalescing ────────────────────────────────────────────────
  const rafRef = useRef<number>(0);
  const pendingMove = useRef<PointerEvent | null>(null);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      pendingMove.current = e.nativeEvent;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const ev = pendingMove.current;
        if (!ev) return;
        const pt = toNorm(ev as unknown as React.PointerEvent);
        if (!pt) return;
        const snapped = applySnap(pt, ev.shiftKey);
        setCurrentPointer(snapped);
      });
    },
    [toNorm, applySnap]
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const { setTool } = useMeasurementStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      setAngleConstrain(e.shiftKey);

      if (e.key === "Escape") { clearDraft(); setTool(null); return; }
      if (e.key === "Backspace" && draftPoints.length > 0) { removeLastDraftPoint(); return; }
      if ((e.key === "Enter" || e.key === "Return") && draftPoints.length >= 2) {
        commitDraft();
      }
      if (e.key.toLowerCase() === "s" && !e.ctrlKey && !e.metaKey) {
        useMeasurementStore.getState().setSnapSettings({
          enabled: !snapSettings.enabled,
        });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setAngleConstrain(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [draftPoints, snapSettings.enabled, clearDraft, removeLastDraftPoint, setTool]);

  // ── Commit draft ──────────────────────────────────────────────────────────
  const commitDraft = useCallback(() => {
    if (!activeTool || draftPoints.length < 1) return;

    const now = new Date().toISOString();
    const base = {
      id: crypto.randomUUID(),
      planId,
      pageNumber,
      calibrationId: calibration?.id ?? null,
      label: null,
      prefix: null,
      suffix: null,
      style: { ...DEFAULT_MEASUREMENT_STYLE },
      locked: false,
      visible: true,
      status: "open" as const,
      groupId: null,
      zIndex: 0,
      revision: 1,
      createdBy: { name: "You" },
      createdAt: now,
      updatedAt: now,
    };

    let m: import("@/lib/measurement/types").Measurement | null = null;

    if (activeTool === "linear" && draftPoints.length >= 2) {
      m = { ...base, type: "linear", start: draftPoints[0], end: draftPoints[1], displayUnit: calibration?.displayUnit ?? "foot", precision: calibration?.precision ?? 2 };
    } else if (activeTool === "diameter" && draftPoints.length >= 2) {
      m = { ...base, type: "diameter", center: draftPoints[0], edge: draftPoints[1], displayUnit: calibration?.displayUnit ?? "foot", precision: calibration?.precision ?? 2 };
    } else if (activeTool === "radius" && draftPoints.length >= 2) {
      m = { ...base, type: "radius", center: draftPoints[0], edge: draftPoints[1], displayUnit: calibration?.displayUnit ?? "foot", precision: calibration?.precision ?? 2 };
    } else if (activeTool === "polyline" && draftPoints.length >= 2) {
      m = { ...base, type: "polyline", points: [...draftPoints], closed: false, displayUnit: calibration?.displayUnit ?? "foot", precision: calibration?.precision ?? 2 };
    } else if (activeTool === "perimeter" && draftPoints.length >= 2) {
      m = { ...base, type: "perimeter", points: [...draftPoints], closed: true, displayUnit: calibration?.displayUnit ?? "foot", precision: calibration?.precision ?? 2 };
    } else if ((activeTool === "polygon-area" || activeTool === "volume") && draftPoints.length >= 3) {
      const validation = validateArea(draftPoints);
      if (!validation.valid) {
        // Don't commit — show error (silently for now)
        return;
      }
      if (activeTool === "polygon-area") {
        m = { ...base, type: "polygon-area", geometry: { kind: "polygon", points: [...draftPoints] }, displayUnit: "square-foot", precision: 2 };
      } else {
        m = { ...base, type: "volume", geometry: { kind: "polygon", points: [...draftPoints] }, depthMillimeters: 100, displayUnit: "cubic-foot", precision: 2 };
      }
    } else if (activeTool === "angle" && draftPoints.length >= 3) {
      m = { ...base, type: "angle", vertex: draftPoints[0], start: draftPoints[1], end: draftPoints[2], precision: 1 };
    } else if (activeTool === "rectangle-area" && draftPoints.length >= 2) {
      const x0 = Math.min(draftPoints[0].x, draftPoints[1].x);
      const y0 = Math.min(draftPoints[0].y, draftPoints[1].y);
      const w = Math.abs(draftPoints[1].x - draftPoints[0].x);
      const h = Math.abs(draftPoints[1].y - draftPoints[0].y);
      m = { ...base, type: "rectangle-area", geometry: { kind: "bounds", bounds: { x: x0, y: y0, width: w, height: h }, rotation: 0 }, displayUnit: "square-foot", precision: 2 };
    } else if (activeTool === "calibrate" && draftPoints.length >= 2) {
      // Delegate to calibration dialog — just signal the callback
      if (onRequestCalibrate) onRequestCalibrate();
      clearDraft();
      return;
    }

    if (m) {
      addMeasurement(m);
      void saveMeasurement(m);
      clearDraft();
    }
  }, [activeTool, draftPoints, planId, pageNumber, calibration, addMeasurement, saveMeasurement, clearDraft, onRequestCalibrate]);

  // ── Pointer down ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 || !activeTool) return;
      const raw = toNorm(e);
      if (!raw) return;
      const pt = applySnap(raw, e.shiftKey);

      e.currentTarget.setPointerCapture(e.pointerId);

      if (CLICK_TOOLS.includes(activeTool)) {
        // For count: add a point each click
        if (activeTool === "count") {
          const countPts = [...draftPoints, pt];
          setDraftPoints(countPts);
        }
        return;
      }

      if (TWO_POINT_TOOLS.includes(activeTool)) {
        if (draftPoints.length === 0) {
          addDraftPoint(pt);
        } else {
          const newPts = [...draftPoints, pt];
          setDraftPoints(newPts);
          // Commit when we have 2 points
          if (newPts.length >= 2) {
            setTimeout(() => commitDraft(), 0);
          }
        }
        return;
      }

      if (VERTEX_TOOLS.includes(activeTool)) {
        // Double-click detection: check if this click is very close to last point
        if (draftPoints.length >= 2) {
          const last = draftPoints[draftPoints.length - 1];
          const dist = Math.sqrt((pt.x - last.x) ** 2 + (pt.y - last.y) ** 2);
          if (dist < 0.005) {
            // Treat as double-click / finish
            commitDraft();
            return;
          }
        }
        addDraftPoint(pt);
        return;
      }
    },
    [activeTool, toNorm, applySnap, draftPoints, addDraftPoint, setDraftPoints, commitDraft]
  );

  // ── Double click to finish vertex tools ───────────────────────────────────
  const onDoubleClick = useCallback(() => {
    if (activeTool && VERTEX_TOOLS.includes(activeTool) && draftPoints.length >= 2) {
      commitDraft();
    }
  }, [activeTool, draftPoints, commitDraft]);

  // ── Sorted page measurements ───────────────────────────────────────────────
  const sortedMeasurements = useMemo(
    () =>
      pageMeasurements
        .filter((m) => m.visible)
        .sort((a, b) => a.zIndex - b.zIndex),
    [pageMeasurements]
  );

  // ── Draft preview quantity ─────────────────────────────────────────────────
  const draftQuantity = useMemo(() => {
    if (!calibration || draftPoints.length < 2) return undefined;
    // Quick preview for linear
    if (activeTool === "linear" && draftPoints.length >= 2 && currentPointer) {
      const m = { type: "linear" as const, start: draftPoints[0], end: currentPointer } as Parameters<typeof formatMeasurementQuantity>[0];
      return formatMeasurementQuantity({ ...m, calibrationId: calibration.id, displayUnit: calibration.displayUnit, precision: calibration.precision } as Parameters<typeof formatMeasurementQuantity>[0], calibration);
    }
    return undefined;
  }, [calibration, draftPoints, activeTool, currentPointer]);

  const cursor = activeTool ? "crosshair" : "default";

  return (
    <svg
      ref={svgRef}
      style={{
        position: "absolute",
        inset: 0,
        width: size.width,
        height: size.height,
        cursor,
        touchAction: "none",
        overflow: "visible",
        pointerEvents: activeTool ? "all" : "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onDoubleClick={onDoubleClick}
    >
      {/* Committed measurements */}
      {sortedMeasurements.map((m) => (
        <MeasurementRenderer
          key={m.id}
          measurement={m}
          calibration={calibration}
          canvasWidth={size.width}
          canvasHeight={size.height}
          selected={selectedIds.includes(m.id)}
          onSelect={(e) => {
            if (!activeTool) {
              e.shiftKey ? useMeasurementStore.getState().selectAdd(m.id) : selectOne(m.id);
            }
          }}
        />
      ))}

      {/* Vertex handles for selected */}
      {selectedIds.map((id) => {
        const m = measurements[id];
        if (!m) return null;
        return (
          <VertexHandles
            key={`vh-${id}`}
            measurement={m}
            canvasWidth={size.width}
            canvasHeight={size.height}
            zoom={zoom}
          />
        );
      })}

      {/* Draft preview */}
      {activeTool && (
        <MeasurementDraft
          tool={activeTool}
          points={draftPoints}
          currentPoint={currentPointer}
          canvasWidth={size.width}
          canvasHeight={size.height}
          calibrated={calibration !== null}
          formattedQuantity={draftQuantity}
        />
      )}

      {/* Snap indicator */}
      {snapCandidate && snapSettings.enabled && (
        <SnapIndicator
          candidate={snapCandidate}
          canvasWidth={size.width}
          canvasHeight={size.height}
        />
      )}
    </svg>
  );
}

