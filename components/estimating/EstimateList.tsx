"use client";

import type { Estimate } from "@/lib/estimating/types";

type Props = {
  estimates: Estimate[];
  onSelect: (id: string) => void;
  onCreateNew: () => void;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B7280",
  "in-review": "#D97706",
  "changes-requested": "#EF4444",
  approved: "#10B981",
  locked: "#6D28D9",
  superseded: "#9CA3AF",
  archived: "#9CA3AF",
};

export function EstimateList({ estimates, onSelect, onCreateNew }: Props) {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>Estimates</h2>
        <button
          onClick={onCreateNew}
          style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          + New Estimate
        </button>
      </div>
      {estimates.length === 0 && (
        <div style={{ textAlign: "center", color: "#6B7280", padding: "32px" }}>
          No estimates yet. Create your first one.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {estimates.map((est) => (
          <div
            key={est.id}
            onClick={() => onSelect(est.id)}
            style={{
              padding: "12px 16px", border: "1px solid #E5E7EB", borderRadius: "8px",
              cursor: "pointer", display: "flex", justifyContent: "space-between",
              alignItems: "center", background: "#fff",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{est.name}</div>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>{est.estimateNumber}</div>
            </div>
            <span style={{
              padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600,
              background: STATUS_COLOR[est.status] ?? "#6B7280", color: "#fff",
            }}>
              {est.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
