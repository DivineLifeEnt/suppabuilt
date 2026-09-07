"use client";

import type { EstimateAdjustment } from "@/lib/estimating/types";
import { formatMoney } from "@/lib/estimating/money";
import type { VersionTotals } from "@/server/estimating/calculation-service";

type Props = {
  adjustments: EstimateAdjustment[];
  totals: VersionTotals | null;
  onAddAdjustment: (kind: EstimateAdjustment["kind"]) => void;
  onRemoveAdjustment: (id: string) => void;
  isReadOnly: boolean;
};

const KIND_LABELS: Record<string, string> = {
  fixed: "Fixed Amount", markup: "Markup %", margin: "Margin %", tax: "Tax %",
};

export function AdjustmentEditor({ adjustments, totals, onAddAdjustment, onRemoveAdjustment, isReadOnly }: Props) {
  const getAmount = (id: string) => {
    const adj = totals?.adjustments.find((a) => a.id === id) ?? totals?.taxes.find((a) => a.id === id);
    return adj ? formatMoney(adj.amount) : "-";
  };

  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>Adjustments</span>
        {!isReadOnly && (
          <div style={{ display: "flex", gap: "4px" }}>
            {(["markup","margin","tax","fixed"] as const).map((k) => (
              <button key={k} onClick={() => onAddAdjustment(k)} style={{ padding: "4px 8px", fontSize: "11px", border: "1px solid #D1D5DB", borderRadius: "4px", cursor: "pointer", background: "#fff" }}>
                + {k}
              </button>
            ))}
          </div>
        )}
      </div>
      {adjustments.length === 0 && (
        <div style={{ color: "#9CA3AF", fontSize: "13px" }}>No adjustments. Add markup, margin, tax, or fixed amounts.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {adjustments.map((adj) => (
          <div key={adj.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", background: "#F9FAFB", borderRadius: "4px", fontSize: "13px" }}>
            <span style={{ flex: 1, fontWeight: 500 }}>{adj.label}</span>
            <span style={{ color: "#6B7280", fontSize: "11px" }}>{KIND_LABELS[adj.kind]} — {adj.basis}</span>
            {"rate" in adj && <span style={{ fontVariantNumeric: "tabular-nums" }}>{(parseFloat(adj.rate) * 100).toFixed(1)}%</span>}
            <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{getAmount(adj.id)}</span>
            {!isReadOnly && (
              <button onClick={() => onRemoveAdjustment(adj.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#DC2626", fontSize: "13px" }}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
