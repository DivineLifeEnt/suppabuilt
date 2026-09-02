"use client";

import React from "react";

interface Props {
  onCalibrate: () => void;
}

export function CalibrationWarning({ onCalibrate }: Props) {
  return (
    <div
      role="alert"
      className="absolute left-1/2 top-4 z-30 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3 rounded-lg border border-amber-600 bg-amber-900/90 px-4 py-2.5 text-sm shadow-2xl cursor-pointer"
      onClick={onCalibrate}
    >
      <span className="text-amber-300 text-base">⚠️</span>
      <span className="text-amber-100">
        This page is <strong>uncalibrated</strong> — measurements requiring scale will show
        &ldquo;Uncalibrated&rdquo;.
      </span>
      <button
        className="ml-2 shrink-0 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-400"
        onClick={(e) => { e.stopPropagation(); onCalibrate(); }}
      >
        Calibrate
      </button>
    </div>
  );
}
