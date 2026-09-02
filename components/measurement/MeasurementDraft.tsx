"use client";

import React from "react";
import type { MeasurementTool } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";

interface Props {
  tool: MeasurementTool;
  points: NormalizedPoint[];
  currentPoint: NormalizedPoint | null;
  canvasWidth: number;
  canvasHeight: number;
  calibrated: boolean;
  formattedQuantity?: string;
}

export function MeasurementDraft({
  tool,
  points,
  currentPoint,
  canvasWidth,
  canvasHeight,
  formattedQuantity,
}: Props) {
  const sx = (n: number) => n * canvasWidth;
  const sy = (n: number) => n * canvasHeight;

  const all = currentPoint ? [...points, currentPoint] : points;

  const stroke = "#F59E0B";
  const dashArray = "6 3";
  const strokeWidth = 1.5;

  if (all.length === 0) return null;

  const renderLabel = () => {
    if (!formattedQuantity || all.length < 2) return null;
    const last = all[all.length - 1];
    return (
      <text
        x={sx(last.x) + 8}
        y={sy(last.y) - 4}
        fontSize={11}
        fill="#F59E0B"
        fontFamily="sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {formattedQuantity}
      </text>
    );
  };

  if (tool === "calibrate" || tool === "linear" || tool === "diameter" || tool === "radius") {
    if (all.length < 2) {
      return (
        <circle
          cx={sx(all[0].x)} cy={sy(all[0].y)} r={4}
          fill={stroke} style={{ pointerEvents: "none" }}
        />
      );
    }
    return (
      <g style={{ pointerEvents: "none" }}>
        <line
          x1={sx(all[0].x)} y1={sy(all[0].y)}
          x2={sx(all[all.length - 1].x)} y2={sy(all[all.length - 1].y)}
          stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray}
        />
        {renderLabel()}
      </g>
    );
  }

  if (tool === "angle") {
    if (all.length === 1) {
      return (
        <circle
          cx={sx(all[0].x)} cy={sy(all[0].y)} r={4}
          fill={stroke} style={{ pointerEvents: "none" }}
        />
      );
    }
    const pts = all.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
    return (
      <g style={{ pointerEvents: "none" }}>
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray} />
        {renderLabel()}
      </g>
    );
  }

  if (tool === "rectangle-area") {
    if (all.length < 2) return null;
    const x0 = Math.min(all[0].x, all[all.length - 1].x);
    const y0 = Math.min(all[0].y, all[all.length - 1].y);
    const w = Math.abs(all[all.length - 1].x - all[0].x);
    const h = Math.abs(all[all.length - 1].y - all[0].y);
    return (
      <g style={{ pointerEvents: "none" }}>
        <rect
          x={sx(x0)} y={sy(y0)} width={sx(w)} height={sy(h)}
          fill={`${stroke}22`} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray}
        />
        {renderLabel()}
      </g>
    );
  }

  // polyline / perimeter / polygon-area / volume / count
  if (all.length === 1) {
    return (
      <circle
        cx={sx(all[0].x)} cy={sy(all[0].y)} r={4}
        fill={stroke} style={{ pointerEvents: "none" }}
      />
    );
  }

  const closedTools: MeasurementTool[] = ["polygon-area", "volume", "perimeter"];
  const closed = closedTools.includes(tool);
  const ptsStr = all.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");

  return (
    <g style={{ pointerEvents: "none" }}>
      {closed ? (
        <polygon
          points={ptsStr}
          fill={`${stroke}22`}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
        />
      ) : (
        <polyline
          points={ptsStr}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
        />
      )}
      {all.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3} fill={stroke} />
      ))}
      {renderLabel()}
    </g>
  );
}
