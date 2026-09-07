"use client";

import type { NormalizedPoint } from "@/lib/markup/types";

type Props = {
  side: "base" | "comp";
  points: NormalizedPoint[];
  onAddPoint: (pt: NormalizedPoint) => void;
  onRemovePoint: (index: number) => void;
  width: number;
  height: number;
};

export function AlignmentPointTool({ side, points, onAddPoint, onRemovePoint, width, height }: Props) {
  function handleClick(e: React.MouseEvent<SVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onAddPoint({ x, y });
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className="absolute inset-0 cursor-crosshair"
      onClick={handleClick}
    >
      {points.map((pt, i) => (
        <g key={i}>
          {side === "base" ? (
            // Circle for base points
            <circle
              cx={pt.x}
              cy={pt.y}
              r={0.015}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={0.004}
            />
          ) : (
            // Cross for comparison points
            <>
              <line x1={pt.x - 0.015} y1={pt.y} x2={pt.x + 0.015} y2={pt.y} stroke="#EF4444" strokeWidth={0.004} />
              <line x1={pt.x} y1={pt.y - 0.015} x2={pt.x} y2={pt.y + 0.015} stroke="#EF4444" strokeWidth={0.004} />
            </>
          )}
          {/* Label */}
          <text
            x={pt.x + 0.02}
            y={pt.y}
            fontSize={0.025}
            fill={side === "base" ? "#3B82F6" : "#EF4444"}
            dominantBaseline="middle"
          >
            {i + 1}
          </text>
          {/* Remove button */}
          <circle
            cx={pt.x - 0.02}
            cy={pt.y - 0.02}
            r={0.01}
            fill="white"
            stroke="#999"
            strokeWidth={0.002}
            className="cursor-pointer"
            onClick={(ev) => {
              ev.stopPropagation();
              onRemovePoint(i);
            }}
          />
          <text
            x={pt.x - 0.02}
            y={pt.y - 0.02}
            fontSize={0.015}
            fill="#666"
            textAnchor="middle"
            dominantBaseline="middle"
            onClick={(ev) => {
              ev.stopPropagation();
              onRemovePoint(i);
            }}
          >
            ×
          </text>
        </g>
      ))}
    </svg>
  );
}
