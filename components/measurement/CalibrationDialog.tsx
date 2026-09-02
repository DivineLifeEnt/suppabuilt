"use client";

import React, { useState, useRef, useEffect } from "react";
import type { NormalizedPoint } from "@/lib/markup/types";
import { validateCalibration } from "@/lib/measurement/validation";
import { normalizedDistance } from "@/lib/measurement/units";
import type { Calibration } from "@/lib/measurement/types";

interface Props {
  planId: string;
  pageNumber: number;
  points: [NormalizedPoint, NormalizedPoint];
  pageWidth: number;
  pageHeight: number;
  onSaved: (cal: Calibration) => void;
  onCancel: () => void;
}

export function CalibrationDialog({
  planId,
  pageNumber,
  points,
  pageWidth,
  pageHeight,
  onSaved,
  onCancel,
}: Props) {
  const [knownDistance, setKnownDistance] = useState("10");
  const [unit, setUnit] = useState<"mm" | "cm" | "m" | "in" | "ft">("ft");
  const [name, setName] = useState("");
  const [applyToAllPages, setApplyToAllPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const toMm = (val: number, u: typeof unit) => {
    switch (u) {
      case "mm": return val;
      case "cm": return val * 10;
      case "m":  return val * 1000;
      case "in": return val * 25.4;
      case "ft": return val * 304.8;
    }
  };

  const toLinearUnit = (u: typeof unit): Calibration["displayUnit"] => {
    switch (u) {
      case "ft": return "foot";
      case "in": return "inch";
      case "m":  return "meter";
      case "cm": return "centimeter";
      case "mm": return "millimeter";
    }
  };

  const handleSave = async () => {
    const numVal = parseFloat(knownDistance);
    if (isNaN(numVal) || numVal <= 0) {
      setError("Enter a positive distance.");
      return;
    }
    const knownMm = toMm(numVal, unit);

    const v = validateCalibration(points[0], points[1], knownMm);
    if (!v.valid) {
      setError(v.error);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const normDist = normalizedDistance(points[0], points[1]);
      const pageUnitsPerMillimeter = normDist / knownMm;

      const body = {
        planId,
        pageNumber: applyToAllPages ? null : pageNumber,
        name: name || `Scale 1:${Math.round(knownMm / normDist)}`,
        normalizedStart: points[0],
        normalizedEnd: points[1],
        knownDistanceMillimeters: knownMm,
        pageUnitsPerMillimeter,
        unitSystem: u === "ft" || u === "in" ? "imperial-architectural" : "metric",
        displayUnit: toLinearUnit(unit),
        precision: 2,
      };
      const res = await fetch(`/api/plans/${planId}/calibrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      const data = (await res.json()) as { calibration: Calibration };
      onSaved(data.calibration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") onCancel();
  };

  // Preview: approximate pixel distance
  const pxDist = Math.sqrt(
    ((points[1].x - points[0].x) * pageWidth) ** 2 +
    ((points[1].y - points[0].y) * pageHeight) ** 2
  );
  const u = unit; // keep a stable local reference for the body builder

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onKeyDown={handleKey}
    >
      <div className="w-80 rounded-xl border border-[#2a3540] bg-[#111820] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[#222c36] px-4 py-3">
          <span className="text-[#ff7a32] text-base">⚖</span>
          <h2 className="text-[13px] font-bold text-white">Set Scale Calibration</h2>
          <button onClick={onCancel} className="ml-auto text-[#64717e] hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="rounded-md bg-[#0d131a] border border-[#1e2830] px-3 py-2">
            <div className="text-[10px] text-[#64717e] mb-1">Measured line</div>
            <div className="text-[12px] text-white font-mono">
              {pxDist.toFixed(1)}px &nbsp;·&nbsp; normalized {normalizedDistance(points[0], points[1]).toFixed(5)}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8895a2] mb-1">
              Known real-world distance
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="number"
                step="any"
                min="0.001"
                value={knownDistance}
                onChange={e => setKnownDistance(e.target.value)}
                className="flex-1 h-8 rounded-md border border-[#364250] bg-[#080c11] px-2 text-white text-[13px] font-mono focus:border-[#ff6a1a] focus:outline-none"
              />
              <select
                value={u}
                onChange={e => setUnit(e.target.value as typeof unit)}
                className="h-8 rounded-md border border-[#364250] bg-[#080c11] px-2 text-white text-[12px] focus:border-[#ff6a1a] focus:outline-none"
              >
                <option value="ft">ft</option>
                <option value="in">in</option>
                <option value="m">m</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8895a2] mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sheet A1 scale"
              className="w-full h-8 rounded-md border border-[#364250] bg-[#080c11] px-2 text-white text-[12px] focus:border-[#ff6a1a] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-[12px] text-[#8895a2] cursor-pointer">
            <input
              type="checkbox"
              checked={applyToAllPages}
              onChange={e => setApplyToAllPages(e.target.checked)}
              className="accent-[#ff6a1a]"
            />
            Apply to all pages (document default)
          </label>

          {error && (
            <div className="rounded-md bg-[#3b1a12] border border-[#6b3320] px-3 py-2 text-[11px] text-[#f87171]">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-[#222c36] px-4 py-3">
          <button
            onClick={onCancel}
            className="flex-1 h-8 rounded-md border border-[#364250] text-[12px] text-[#8895a2] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 h-8 rounded-md bg-[#ff6a1a] text-[12px] font-bold text-white hover:bg-[#ff7b34] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Set Scale"}
          </button>
        </div>
      </div>
    </div>
  );
}
