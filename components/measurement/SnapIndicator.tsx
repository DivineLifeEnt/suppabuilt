"use client";

import React from "react";
import type { SnapCandidate } from "@/lib/measurement/snapping";

interface Props {
  candidate: SnapCandidate;
  canvasWidth: number;
  canvasHeight: number;
}

export function SnapIndicator({ candidate, canvasWidth, canvasHeight }: Props) {
  const cx = candidate.point.x * canvasWidth;
  const cy = candidate.point.y * canvasHeight;
  const r = 6;

  return (
    <g style={{ pointerEvents: "none" }}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#F59E0B"
        strokeWidth={2}
      />
      <circle cx={cx} cy={cy} r={2} fill="#F59E0B" />
      <text
        x={cx + r + 4}
        y={cy + 4}
        fontSize={9}
        fill="#F59E0B"
        fontFamily="sans-serif"
      >
        {candidate.kind}
      </text>
    </g>
  );
}
