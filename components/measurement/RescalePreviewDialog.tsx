"use client";

import React, { useState } from "react";
import type { Calibration } from "@/lib/measurement/types";

interface RescalePreviewItem {
  measurementId: string;
  oldFormatted: string;
  newFormatted: string;
}

interface Props {
  planId: string;
  calibration: Calibration;
  onApplied: (updated: Calibration) => void;
  onCancel: () => void;
}

export function RescalePreviewDialog({ planId, calibration, onApplied, onCancel }: Props) {
  const [knownDistance, setKnownDistance] = useState("");
  const [unit, setUnit] = useState<"mm" | "cm" | "m" | "in" | "ft">("ft");
  const [preview, setPreview] = useState<RescalePreviewItem[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toMm = (val: number, u: typeof unit) => {
    switch (u) {
      case "mm": return val;
      case "cm": return val * 10;
      case "m":  return val * 1000;
      case "in": return val * 25.4;
      case "ft": return val * 304.8;
    }
  };

  const handlePreview = async () => {
    const numVal = parseFloat(knownDistance);
    if (isNaN(numVal) || numVal <= 0) { setError("Enter a positive distance."); return; }
    const knownMm = toMm(numVal, unit);

    setPreviewing(true);
    setError(null);
    try {
      const res = await fetch(`/api/calibrations/${calibration.id}/rescale-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knownDistanceMm: knownMm }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Preview failed");
      }
      const d = (await res.json()) as { items: RescalePreviewItem[] };
      setPreview(d.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    const numVal = parseFloat(knownDistance);
    if (isNaN(numVal) || numVal <= 0) return;
    const knownMm = toMm(numVal, unit);

    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/calibrations/${calibration.id}/rescale`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knownDistanceMm: knownMm, expectedRevision: calibration.revision }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Rescale failed");
      }
      const d = (await res.json()) as { calibration: Calibration };
      onApplied(d.calibration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rescale failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-96 max-h-[80vh] flex flex-col rounded-xl border border-[#2a3540] bg-[#111820] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[#222c36] px-4 py-3 shrink-0">
          <span className="text-[#ff7a32]">⚖</span>
          <h2 className="text-[13px] font-bold text-white">Rescale Calibration</h2>
          <button onClick={onCancel} className="ml-auto text-[#64717e] hover:text-white">✕</button>
        </div>

        <div className="px-4 py-4 space-y-3 shrink-0">
          <div className="text-[11px] text-[#8895a2]">
            Enter the corrected real-world distance for this calibration line. All measurements using it will be rescaled.
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              min="0.001"
              value={knownDistance}
              onChange={e => setKnownDistance(e.target.value)}
              placeholder="Distance"
              className="flex-1 h-8 rounded-md border border-[#364250] bg-[#080c11] px-2 text-white text-[13px] font-mono focus:border-[#ff6a1a] focus:outline-none"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as typeof unit)}
              className="h-8 rounded-md border border-[#364250] bg-[#080c11] px-2 text-white text-[12px] focus:border-[#ff6a1a] focus:outline-none"
            >
              <option value="ft">ft</option>
              <option value="in">in</option>
              <option value="m">m</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
            </select>
            <button
              onClick={() => void handlePreview()}
              disabled={previewing || !knownDistance}
              className="h-8 px-3 rounded-md bg-[#1e2830] text-[12px] text-white hover:bg-[#28343e] disabled:opacity-50 transition-colors"
            >
              {previewing ? "…" : "Preview"}
            </button>
          </div>
          {error && (
            <div className="rounded-md bg-[#3b1a12] border border-[#6b3320] px-3 py-2 text-[11px] text-[#f87171]">
              {error}
            </div>
          )}
        </div>

        {preview && (
          <div className="flex-1 min-h-0 overflow-y-auto border-t border-[#222c36]">
            {preview.length === 0 ? (
              <div className="px-4 py-3 text-[11px] text-[#64717e]">No measurements will change.</div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[#222c36] bg-[#0d131a]">
                    <th className="px-3 py-2 text-left font-semibold text-[#8895a2]">ID</th>
                    <th className="px-3 py-2 text-right font-semibold text-[#8895a2]">Before</th>
                    <th className="px-3 py-2 text-right font-semibold text-[#ff7a32]">After</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item) => (
                    <tr key={item.measurementId} className="border-b border-[#1a232d]">
                      <td className="px-3 py-1.5 font-mono text-[#64717e]">{item.measurementId.slice(0, 8)}</td>
                      <td className="px-3 py-1.5 text-right text-[#bdc6ce]">{item.oldFormatted}</td>
                      <td className="px-3 py-1.5 text-right text-[#ff7a32] font-semibold">{item.newFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="flex gap-2 border-t border-[#222c36] px-4 py-3 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 h-8 rounded-md border border-[#364250] text-[12px] text-[#8895a2] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleApply()}
            disabled={applying || !preview}
            className="flex-1 h-8 rounded-md bg-[#ff6a1a] text-[12px] font-bold text-white hover:bg-[#ff7b34] disabled:opacity-50 transition-colors"
          >
            {applying ? "Applying…" : "Apply Rescale"}
          </button>
        </div>
      </div>
    </div>
  );
}
