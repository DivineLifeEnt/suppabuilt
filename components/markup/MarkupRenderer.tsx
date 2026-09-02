"use client";

import React from "react";
import type { Markup, MarkupStyle } from "@/lib/markup/types";
import { cloudPath } from "@/lib/markup/cloud";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  markup: Markup;
  canvasWidth: number;
  canvasHeight: number;
  selected: boolean;
  onSelect: (e: React.PointerEvent) => void;
}

// ─── Style helpers ────────────────────────────────────────────────────────────
function baseProps(style: MarkupStyle) {
  return {
    stroke: style.color,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    fill: "none",
  };
}

// ─── Selection handle overlay ─────────────────────────────────────────────────
function SelectionHandles({
  x, y, w, h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const handles = [
    { cx: x, cy: y },
    { cx: x + w / 2, cy: y },
    { cx: x + w, cy: y },
    { cx: x + w, cy: y + h / 2 },
    { cx: x + w, cy: y + h },
    { cx: x + w / 2, cy: y + h },
    { cx: x, cy: y + h },
    { cx: x, cy: y + h / 2 },
  ];

  return (
    <g className="selection-handles" style={{ pointerEvents: "none" }}>
      <rect
        x={x - 2}
        y={y - 2}
        width={w + 4}
        height={h + 4}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={1.5}
        strokeDasharray="4 2"
      />
      {handles.map((h, i) => (
        <circle
          key={i}
          cx={h.cx}
          cy={h.cy}
          r={4}
          fill="white"
          stroke="#3B82F6"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

function LockIcon({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={y} fontSize={12} textAnchor="middle" fill="#F59E0B" style={{ pointerEvents: "none" }}>
      🔒
    </text>
  );
}

// ─── Icon paths ───────────────────────────────────────────────────────────────
function CheckmarkPath({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const s = r * 0.6;
  return (
    <polyline
      points={`${cx - s},${cy} ${cx - s * 0.2},${cy + s * 0.8} ${cx + s},${cy - s * 0.8}`}
      fill="none"
    />
  );
}

function CrossPath({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const s = r * 0.7;
  return (
    <>
      <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} />
      <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} />
    </>
  );
}

function PinPath({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      <circle cx={cx} cy={cy - r * 0.3} r={r * 0.5} />
      <line x1={cx} y1={cy - r * 0.3 + r * 0.5} x2={cx} y2={cy + r} />
    </>
  );
}

// ─── Arrowhead ────────────────────────────────────────────────────────────────
function Arrowhead({
  x1, y1, x2, y2, color, size,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; size: number;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 6;
  const tip = { x: x2, y: y2 };
  const left = {
    x: x2 - size * Math.cos(angle - spread),
    y: y2 - size * Math.sin(angle - spread),
  };
  const right = {
    x: x2 - size * Math.cos(angle + spread),
    y: y2 - size * Math.sin(angle + spread),
  };
  return (
    <polygon
      points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
      fill={color}
    />
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────
export function MarkupRenderer({ markup, canvasWidth, canvasHeight, selected, onSelect }: Props) {
  if (!markup.visible) return null;

  const sx = (n: number) => n * canvasWidth;
  const sy = (n: number) => n * canvasHeight;
  const p = baseProps(markup.style);

  const sharedEvents = {
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      onSelect(e);
    },
    style: { cursor: markup.locked ? "not-allowed" : "pointer" } as React.CSSProperties,
  };

  let content: React.ReactNode = null;
  let selBounds: { x: number; y: number; w: number; h: number } | null = null;

  switch (markup.kind) {
    case "bounds": {
      const { x, y, width, height } = markup.bounds;
      const bx = sx(x);
      const by = sy(y);
      const bw = sx(width);
      const bh = sy(height);
      selBounds = { x: bx, y: by, w: bw, h: bh };

      if (markup.tool === "rectangle") {
        content = <rect x={bx} y={by} width={bw} height={bh} {...p} {...sharedEvents} />;
      } else if (markup.tool === "ellipse") {
        content = (
          <ellipse cx={bx + bw / 2} cy={by + bh / 2} rx={bw / 2} ry={bh / 2} {...p} {...sharedEvents} />
        );
      } else if (markup.tool === "highlighter") {
        content = (
          <rect
            x={bx} y={by} width={bw} height={bh}
            fill={markup.style.color}
            fillOpacity={0.35}
            stroke="none"
            opacity={markup.style.opacity}
            {...sharedEvents}
          />
        );
      }
      break;
    }

    case "path": {
      if (markup.points.length < 2) break;
      const pts = markup.points.map((pt) => `${sx(pt.x)},${sy(pt.y)}`).join(" ");
      const firstPt = markup.points[0];
      const lastPt = markup.points[markup.points.length - 1];
      const bx = Math.min(...markup.points.map((pt) => sx(pt.x)));
      const by = Math.min(...markup.points.map((pt) => sy(pt.y)));
      const bw = Math.max(...markup.points.map((pt) => sx(pt.x))) - bx;
      const bh = Math.max(...markup.points.map((pt) => sy(pt.y))) - by;
      selBounds = { x: bx, y: by, w: bw, h: bh };

      if (markup.tool === "pen") {
        content = <polyline points={pts} {...p} {...sharedEvents} />;
      } else if (markup.tool === "cloud") {
        const d = cloudPath(bx, by, bw, bh);
        content = <path d={d} {...p} {...sharedEvents} />;
      }
      break;
    }

    case "line": {
      const x1 = sx(markup.start.x);
      const y1 = sy(markup.start.y);
      const x2 = sx(markup.end.x);
      const y2 = sy(markup.end.y);
      selBounds = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
      };

      if (markup.tool === "line") {
        content = <line x1={x1} y1={y1} x2={x2} y2={y2} {...p} {...sharedEvents} />;
      } else if (markup.tool === "arrow") {
        const headSize = Math.max(8, markup.style.strokeWidth * 4);
        content = (
          <g {...sharedEvents}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} {...p} />
            <Arrowhead x1={x1} y1={y1} x2={x2} y2={y2} color={markup.style.color} size={headSize} />
          </g>
        );
      }
      break;
    }

    case "point": {
      const cx = sx(markup.point.x);
      const cy = sy(markup.point.y);
      const r = 14;
      selBounds = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };

      const symProps = { ...p, strokeWidth: markup.style.strokeWidth };

      if (markup.tool === "checkmark") {
        content = (
          <g {...sharedEvents}>
            <circle cx={cx} cy={cy} r={r} fill={markup.style.color} fillOpacity={0.15} stroke={markup.style.color} strokeWidth={markup.style.strokeWidth} />
            <CheckmarkPath cx={cx} cy={cy} r={r} {...symProps} />
          </g>
        );
      } else if (markup.tool === "cross") {
        content = (
          <g {...sharedEvents}>
            <circle cx={cx} cy={cy} r={r} fill={markup.style.color} fillOpacity={0.15} stroke={markup.style.color} strokeWidth={markup.style.strokeWidth} />
            <CrossPath cx={cx} cy={cy} r={r} {...symProps} />
          </g>
        );
      } else if (markup.tool === "pin") {
        content = (
          <g {...sharedEvents}>
            <PinPath cx={cx} cy={cy} r={r} {...symProps} />
          </g>
        );
      }
      break;
    }

    case "text": {
      const tx = sx(markup.point.x);
      const ty = sy(markup.point.y);
      const fs = markup.style.fontSize ?? 16;
      selBounds = { x: tx, y: ty - fs, w: Math.min(300, markup.text.length * fs * 0.6), h: fs * 1.4 };

      content = (
        <foreignObject x={tx} y={ty - fs} width={400} height={200} {...sharedEvents}>
          <div
            style={{
              color: markup.style.color,
              fontSize: fs,
              opacity: markup.style.opacity,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxWidth: 400,
              lineHeight: 1.4,
              userSelect: "none",
            }}
          >
            {markup.text}
          </div>
        </foreignObject>
      );
      break;
    }
  }

  return (
    <g data-markup-id={markup.id}>
      {content}
      {selected && selBounds && (
        <SelectionHandles
          x={selBounds.x}
          y={selBounds.y}
          w={selBounds.w}
          h={selBounds.h}
        />
      )}
      {markup.locked && selBounds && (
        <LockIcon
          x={selBounds.x + selBounds.w / 2}
          y={selBounds.y - 8}
        />
      )}
    </g>
  );
}
