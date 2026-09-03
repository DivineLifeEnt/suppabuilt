"use client";

import { useState } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { TakeoffItem } from "@/lib/takeoff/types";

interface Props {
  itemId: string;
}

const PRESETS = [0, 5, 10, 15, 20];

export function WasteFactorControl({ itemId }: Props) {
  const { items, updateItem, setSaveState } = useTakeoffStore();
  const item = items[itemId];
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  async function apply(value: string) {
    if (!item || item.locked) return;
    setSaving(true);
    setSaveState("saving");
    try {
      const res = await fetch(`/api/takeoff-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: item.revision, wastePercent: value }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { item: TakeoffItem };
      updateItem(data.item);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Waste Factor</label>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            disabled={saving || item.locked}
            onClick={() => apply(String(p))}
            style={{
              padding: "3px 8px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: item.wastePercent === String(p) ? "var(--brand)" : "var(--surface-2)",
              color: item.wastePercent === String(p) ? "#fff" : "var(--text-1)",
              cursor: item.locked ? "not-allowed" : "pointer",
              fontSize: 12,
            }}
          >
            {p}%
          </button>
        ))}
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          defaultValue={item.wastePercent}
          disabled={saving || item.locked}
          onBlur={(e) => { if (e.target.value !== item.wastePercent) apply(e.target.value); }}
          style={{ width: 64, padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--surface-2)", color: "var(--text-1)" }}
        />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-2)" }}>
        Gross: {item.grossQuantity} {item.unit}
      </div>
    </div>
  );
}
