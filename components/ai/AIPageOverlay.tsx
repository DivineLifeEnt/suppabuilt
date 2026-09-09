"use client";

import type { AISuggestion } from "@/lib/ai/types";

const STATUS_COLORS: Record<AISuggestion["status"], string> = {
  pending: "#3B82F6",   // blue
  accepted: "#22C55E",  // green
  rejected: "#EF4444",  // red
  superseded: "#9CA3AF", // gray
};

interface Props {
  suggestions: AISuggestion[];
  pageWidthPx: number;
  pageHeightPx: number;
  className?: string;
}

export function AIPageOverlay({ suggestions, pageWidthPx, pageHeightPx, className }: Props) {
  const withBoxes = suggestions.filter((s) => s.boundingBox);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${pageWidthPx} ${pageHeightPx}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {withBoxes.map((s) => {
        const box = s.boundingBox!;
        const x = box.x * pageWidthPx;
        const y = box.y * pageHeightPx;
        const w = box.w * pageWidthPx;
        const h = box.h * pageHeightPx;
        const color = STATUS_COLORS[s.status];

        return (
          <g key={s.id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={`${color}22`}
              stroke={color}
              strokeWidth={1.5}
              rx={2}
            />
            <text
              x={x + 2}
              y={y - 2}
              fontSize={10}
              fill={color}
              fontFamily="system-ui, sans-serif"
            >
              {s.symbolType ?? s.kind}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
