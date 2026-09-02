"use client";

import React, { useState, useEffect } from "react";
import { useMeasurementStore } from "@/stores/measurementStore";
import { formatMeasurementQuantity } from "@/lib/measurement/formatting";
import type { Calibration } from "@/lib/measurement/types";

interface Props {
  calibration: Calibration | null;
}

export function MeasurementProperties({ calibration }: Props) {
  const { selectedIds, measurements, updateMeasurement, deleteMeasurement } = useMeasurementStore();

  const [label, setLabel] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const selected = selectedIds
    .map((id) => measurements[id])
    .filter(Boolean);

  const first = selected[0];

  useEffect(() => {
    if (first) {
      setLabel(first.label ?? "");
      setPrefix(first.prefix ?? "");
      setSuffix(first.suffix ?? "");
    }
  }, [first?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (selected.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-[#64717e]">
        Select a measurement to view properties.
      </div>
    );
  }

  const handleUpdate = () => {
    selected.forEach((m) => {
      updateMeasurement(m.id, {
        label: label || null,
        prefix: prefix || null,
        suffix: suffix || null,
      } as Partial<typeof m>);
    });
    // Persist each update
    selected.forEach((m) => {
      void fetch(`/api/measurements/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || null,
          prefix: prefix || null,
          suffix: suffix || null,
          expectedRevision: m.revision,
        }),
      });
    });
  };

  const handleDelete = () => {
    selected.forEach((m) => {
      deleteMeasurement(m.id);
      void fetch(`/api/measurements/${m.id}`, { method: "DELETE" });
    });
  };

  const quantity = first ? formatMeasurementQuantity(first, calibration) : "—";

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="rounded-md bg-[#0d131a] border border-[#1e2830] px-3 py-2">
        <div className="text-[10px] text-[#64717e] mb-0.5">
          {selected.length > 1 ? `${selected.length} selected` : first?.type ?? ""}
        </div>
        <div className="text-[13px] font-bold text-[#ff7a32] font-mono">{quantity}</div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="text-[10px] font-semibold text-[#8895a2] block mb-1">Label</span>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Main supply duct"
            className="w-full h-7 rounded border border-[#364250] bg-[#080c11] px-2 text-white text-[11px] focus:border-[#ff6a1a] focus:outline-none"
          />
        </label>
        <div className="flex gap-2">
          <label className="flex-1 block">
            <span className="text-[10px] font-semibold text-[#8895a2] block mb-1">Prefix</span>
            <input
              type="text"
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
              placeholder="e.g. ≈"
              className="w-full h-7 rounded border border-[#364250] bg-[#080c11] px-2 text-white text-[11px] focus:border-[#ff6a1a] focus:outline-none"
            />
          </label>
          <label className="flex-1 block">
            <span className="text-[10px] font-semibold text-[#8895a2] block mb-1">Suffix</span>
            <input
              type="text"
              value={suffix}
              onChange={e => setSuffix(e.target.value)}
              placeholder="e.g. (typ)"
              className="w-full h-7 rounded border border-[#364250] bg-[#080c11] px-2 text-white text-[11px] focus:border-[#ff6a1a] focus:outline-none"
            />
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleUpdate}
          className="flex-1 h-7 rounded bg-[#ff6a1a] text-[11px] font-bold text-white hover:bg-[#ff7b34] transition-colors"
        >
          Update
        </button>
        <button
          onClick={handleDelete}
          className="h-7 w-7 rounded bg-[#3b1a12] text-[11px] text-[#f87171] hover:bg-[#5b2a1a] transition-colors"
          title="Delete selected"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
