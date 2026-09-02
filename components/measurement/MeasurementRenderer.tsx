"use client";

import React from "react";
import type { Measurement, Calibration } from "@/lib/measurement/types";
import type { NormalizedPoint } from "@/lib/markup/types";
import { formatMeasurementQuantity } from "@/lib/measurement/formatting";
import { midpoint, polygonCentroid } from "@/lib/measurement/geometry";

interface Props {
  measurement: Measurement;
  calibration: Calibration | null;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}

export function MeasurementRenderer({
  measurement: m,
  calibration: cal,
  canvasWidth: W,
  canvasHeight: H,
  selected,
  onSelect,
}: Props) {
  if (!m.visible) return null;

  const sx = (n: number) => n * W;
  const sy = (n: number) => n * H;

  const { stroke, strokeWidth, fill, opacity, fontSize } = m.style;
  const label = formatMeasurementQuantity(m, cal);
  const displayLabel = [m.prefix, label, m.suffix].filter(Boolean).join(" ");

  const selStyle = selected
    ? { filter: "drop-shadow(0 0 4px rgba(245,158,11,0.8))" }
    : {};

  switch (m.type) {
    case "linear": {
      const x1 = sx(m.start.x);
      const y1 = sy(m.start.y);
      const x2 = sx(m.end.x);
      const y2 = sy(m.end.y);
      const mp = midpoint(m.start, m.end);
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} />
          {/* tick marks */}
          <line x1={x1 - 4} y1={y1 - 4} x2={x1 + 4} y2={y1 + 4} stroke={stroke} strokeWidth={1} />
          <line x1={x2 - 4} y1={y2 - 4} x2={x2 + 4} y2={y2 + 4} stroke={stroke} strokeWidth={1} />
          <text x={sx(mp.x)} y={sy(mp.y) - 6} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            {displayLabel}
          </text>
        </g>
      );
    }

    case "polyline":
    case "perimeter": {
      const pts = m.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
      const mp = m.points.length >= 2
        ? midpoint(m.points[0], m.points[m.points.length - 1])
        : m.points[0] ?? { x: 0, y: 0 };
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <polyline points={pts} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          {m.closed && m.points.length > 2 && (
            <line
              x1={sx(m.points[m.points.length - 1].x)} y1={sy(m.points[m.points.length - 1].y)}
              x2={sx(m.points[0].x)} y2={sy(m.points[0].y)}
              stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="3 2"
            />
          )}
          <text x={sx(mp.x)} y={sy(mp.y) - 6} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            {displayLabel}
          </text>
        </g>
      );
    }

    case "polygon-area":
    case "rectangle-area": {
      const points =
        m.geometry.kind === "polygon"
          ? m.geometry.points
          : boundsToCorners(m.geometry.bounds);
      const pts = points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
      const centroid = polygonCentroid(points);
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <polygon
            points={pts}
            fill={fill ?? `${stroke}22`}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <text x={sx(centroid.x)} y={sy(centroid.y)} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            {displayLabel}
          </text>
        </g>
      );
    }

    case "volume": {
      const points =
        m.geometry.kind === "polygon"
          ? m.geometry.points
          : boundsToCorners(m.geometry.bounds);
      const pts = points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
      const centroid = polygonCentroid(points);
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <polygon
            points={pts}
            fill={fill ?? `${stroke}22`}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray="4 2"
          />
          <text x={sx(centroid.x)} y={sy(centroid.y)} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            {displayLabel}
          </text>
          <text x={sx(centroid.x)} y={sy(centroid.y) + fontSize + 2} textAnchor="middle" fontSize={fontSize * 0.8} fill={stroke} fontFamily="sans-serif" opacity={0.7}>
            d={m.depthMillimeters.toFixed(0)}mm
          </text>
        </g>
      );
    }

    case "diameter": {
      const cx = sx(m.center.x);
      const cy = sy(m.center.y);
      const ex = sx(m.edge.x);
      const ey = sy(m.edge.y);
      const r = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
      const mp = midpoint(m.center, m.edge);
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} opacity={0.5} />
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={stroke} strokeWidth={strokeWidth} />
          <text x={sx(mp.x)} y={sy(mp.y) - 6} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            ⌀ {displayLabel}
          </text>
        </g>
      );
    }

    case "radius": {
      const cx = sx(m.center.x);
      const cy = sy(m.center.y);
      const ex = sx(m.edge.x);
      const ey = sy(m.edge.y);
      const r = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
      const mp = midpoint(m.center, m.edge);
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} opacity={0.5} />
          <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={stroke} strokeWidth={strokeWidth} />
          <text x={sx(mp.x)} y={sy(mp.y) - 6} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            r {displayLabel}
          </text>
        </g>
      );
    }

    case "angle": {
      const vx = sx(m.vertex.x);
      const vy = sy(m.vertex.y);
      const ax = sx(m.start.x);
      const ay = sy(m.start.y);
      const bx = sx(m.end.x);
      const by = sy(m.end.y);
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          <line x1={vx} y1={vy} x2={ax} y2={ay} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={vx} y1={vy} x2={bx} y2={by} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={vx} cy={vy} r={20} fill="none" stroke={stroke} strokeWidth={1} opacity={0.5} />
          <text x={vx} y={vy - 24} textAnchor="middle" fontSize={fontSize} fill={stroke} fontFamily="sans-serif">
            {displayLabel}
          </text>
        </g>
      );
    }

    case "count": {
      return (
        <g opacity={opacity} style={selStyle} onClick={onSelect} cursor="pointer">
          {m.points.map((p, i) => (
            <g key={i}>
              <circle
                cx={sx(p.x)} cy={sy(p.y)} r={8}
                fill={fill ?? stroke} stroke={stroke} strokeWidth={1}
              />
              <text
                x={sx(p.x)} y={sy(p.y) + 4}
                textAnchor="middle" fontSize={9} fill="#fff" fontFamily="sans-serif"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </g>
      );
    }
  }
}

function boundsToCorners(bounds: { x: number; y: number; width: number; height: number }): NormalizedPoint[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}
