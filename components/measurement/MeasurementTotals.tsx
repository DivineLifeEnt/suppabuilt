"use client";

import React, { useMemo } from "react";
import { useMeasurementStore } from "@/stores/measurementStore";
import type { Calibration } from "@/lib/measurement/types";
import {
  calculateLinearMm,
  calculatePolylineMm,
  calculatePerimeterMm,
  calculateAreaMm2,
  calculateVolumeMm3,
} from "@/lib/measurement/calculations";
import { formatLinear, formatArea, formatVolume } from "@/lib/measurement/formatting";

interface Props {
  pageNumber: number;
  calibration: Calibration | null;
}

interface Totals {
  linearMm: number;
  perimeterMm: number;
  areaMm2: number;
  volumeMm3: number;
  countTotal: number;
}

export function MeasurementTotals({ pageNumber, calibration }: Props) {
  const { measurements } = useMeasurementStore();

  const totals = useMemo<Totals>(() => {
    const pageMeasurements = Object.values(measurements).filter(
      (m) => m.pageNumber === pageNumber && m.visible
    );

    let linearMm = 0;
    let perimeterMm = 0;
    let areaMm2 = 0;
    let volumeMm3 = 0;
    let countTotal = 0;

    for (const m of pageMeasurements) {
      if (m.type === "count") {
        countTotal += m.points.length;
        continue;
      }
      if (!calibration) continue;

      try {
        switch (m.type) {
          case "linear":
            linearMm += calculateLinearMm(m.start, m.end, calibration);
            break;
          case "diameter":
            // diameter = 2 × radius
            linearMm += calculateLinearMm(m.center, m.edge, calibration) * 2;
            break;
          case "radius":
            linearMm += calculateLinearMm(m.center, m.edge, calibration);
            break;
          case "polyline":
            linearMm += calculatePolylineMm(m.points, calibration);
            break;
          case "perimeter":
            perimeterMm += calculatePerimeterMm(m.points, calibration);
            break;
          case "polygon-area":
          case "rectangle-area":
            areaMm2 += calculateAreaMm2(m.geometry, calibration);
            break;
          case "volume":
            volumeMm3 += calculateVolumeMm3(m.geometry, m.depthMillimeters, calibration);
            break;
          case "angle":
            // Angle doesn't contribute to summable totals
            break;
        }
      } catch {
        // Skip malformed measurement
      }
    }

    return { linearMm, perimeterMm, areaMm2, volumeMm3, countTotal };
  }, [measurements, pageNumber, calibration]);

  const hasData =
    totals.linearMm > 0 ||
    totals.perimeterMm > 0 ||
    totals.areaMm2 > 0 ||
    totals.volumeMm3 > 0 ||
    totals.countTotal > 0;

  if (!hasData) {
    return (
      <div className="px-3 py-3 text-center text-[10px] text-[#64717e]">
        Totals appear here once measurements are added.
      </div>
    );
  }

  const rows: Array<{ label: string; value: string }> = [];

  if (calibration) {
    if (totals.linearMm > 0) {
      rows.push({ label: "Linear", value: formatLinear(totals.linearMm, "foot", 2, 8) });
    }
    if (totals.perimeterMm > 0) {
      rows.push({ label: "Perimeter", value: formatLinear(totals.perimeterMm, "foot", 2, 8) });
    }
    if (totals.areaMm2 > 0) {
      rows.push({ label: "Area", value: formatArea(totals.areaMm2, "square-foot", 2) });
    }
    if (totals.volumeMm3 > 0) {
      rows.push({ label: "Volume", value: formatVolume(totals.volumeMm3, "cubic-foot", 2) });
    }
  }
  if (totals.countTotal > 0) {
    rows.push({ label: "Count", value: String(totals.countTotal) });
  }

  return (
    <div className="border-t border-[#222c36] px-3 py-2">
      <div className="text-[9px] font-bold tracking-[.14em] text-[#8895a2] mb-1.5">SHEET TOTALS</div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-[10px] text-[#64717e]">{row.label}</span>
            <span className="text-[11px] font-mono font-bold text-white">{row.value}</span>
          </div>
        ))}
        {!calibration && totals.countTotal > 0 && (
          <div className="text-[10px] text-[#8895a2] italic mt-1">Calibrate to see linear/area totals</div>
        )}
      </div>
    </div>
  );
}
