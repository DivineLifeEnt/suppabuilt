"use client";

import React, { useCallback } from "react";
import type { Measurement } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";
import { useMeasurementStore } from "@/stores/measurementStore";

interface Props {
  measurement: Measurement;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

function extractVertices(m: Measurement): { pts: NormalizedPoint[]; kind: "points" | "linear" | "circular" | "angle" | "none" } {
  switch (m.type) {
    case "linear":
      return { pts: [m.start, m.end], kind: "linear" };
    case "polyline":
    case "perimeter":
      return { pts: m.points, kind: "points" };
    case "polygon-area":
    case "rectangle-area":
    case "volume":
      if (m.geometry.kind === "polygon") return { pts: m.geometry.points, kind: "points" };
      return { pts: [], kind: "none" };
    case "diameter":
    case "radius":
      return { pts: [m.center, m.edge], kind: "circular" };
    case "angle":
      return { pts: [m.vertex, m.start, m.end], kind: "angle" };
    case "count":
      return { pts: m.points, kind: "points" };
    default:
      return { pts: [], kind: "none" };
  }
}

export function VertexHandles({ measurement, canvasWidth, canvasHeight }: Props) {
  const { updateMeasurement } = useMeasurementStore();

  const { pts, kind } = extractVertices(measurement);

  const handleDrag = useCallback(
    (index: number, newPt: NormalizedPoint) => {
      if (measurement.locked) return;

      if (kind === "linear" && (measurement.type === "linear")) {
        if (index === 0) updateMeasurement(measurement.id, { start: newPt } as Partial<Measurement>);
        else updateMeasurement(measurement.id, { end: newPt } as Partial<Measurement>);
      } else if (kind === "points" && (measurement.type === "polyline" || measurement.type === "perimeter" || measurement.type === "count")) {
        const newPts = [...measurement.points];
        newPts[index] = newPt;
        updateMeasurement(measurement.id, { points: newPts } as Partial<Measurement>);
      }
    },
    [measurement, kind, updateMeasurement]
  );

  return (
    <g style={{ pointerEvents: "all" }}>
      {pts.map((pt, i) => {
        const cx = pt.x * canvasWidth;
        const cy = pt.y * canvasHeight;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={5}
            fill="#F59E0B"
            stroke="#fff"
            strokeWidth={1.5}
            cursor="move"
            onPointerDown={(e) => {
              e.stopPropagation();
              const svg = e.currentTarget.closest("svg");
              if (!svg) return;
              const rect = svg.getBoundingClientRect();

              const onMove = (me: PointerEvent) => {
                const nx = Math.max(0, Math.min(1, (me.clientX - rect.left) / canvasWidth));
                const ny = Math.max(0, Math.min(1, (me.clientY - rect.top) / canvasHeight));
                handleDrag(i, { x: nx, y: ny });
              };
              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          />
        );
      })}
    </g>
  );
}
