"use client";

import type { VersionTotals } from "@/server/estimating/calculation-service";
import { formatMoney } from "@/lib/estimating/money";

type Props = {
  totals: VersionTotals | null;
  showInternalCosts: boolean;
  onToggleInternal: () => void;
};

export function EstimateTotals({ totals, showInternalCosts, onToggleInternal }: Props) {
  if (!totals) {
    return (
      <div style={{ padding: "12px 16px", borderTop: "1px solid #E5E7EB", background: "#F9FAFB", color: "#9CA3AF", fontSize: "13px" }}>
        Calculating totals…
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", borderTop: "2px solid #E5E7EB", background: "#F9FAFB" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "13px" }}>Totals — {totals.currency}</span>
        <button onClick={onToggleInternal} style={{ fontSize: "11px", padding: "3px 8px", border: "1px solid #D1D5DB", borderRadius: "4px", cursor: "pointer", background: "#fff" }}>
          {showInternalCosts ? "Hide Internal" : "Show Internal"}
        </button>
      </div>
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "12px" }}>
        {showInternalCosts && (
          <>
            <TotalCell label="Material" value={formatMoney(totals.materialCost)} />
            <TotalCell label="Labor" value={formatMoney(totals.laborCost)} />
            <TotalCell label="Equipment" value={formatMoney(totals.equipmentCost)} />
            <TotalCell label="Subcontract" value={formatMoney(totals.subcontractCost)} />
            <TotalCell label="Other" value={formatMoney(totals.otherDirectCost)} />
            <div style={{ borderLeft: "1px solid #D1D5DB", margin: "0 4px" }} />
            <TotalCell label="Direct Cost" value={formatMoney(totals.totalDirectCost)} bold />
          </>
        )}
        {totals.adjustments.map((adj) => (
          <TotalCell key={adj.id} label={adj.label} value={formatMoney(adj.amount)} />
        ))}
        <TotalCell label="Base Total" value={formatMoney(totals.baseTotal)} bold />
        {totals.taxes.map((tax) => (
          <TotalCell key={tax.id} label={tax.label} value={formatMoney(tax.amount)} />
        ))}
        <TotalCell label="TOTAL" value={formatMoney(totals.finalTotal)} bold accent />
      </div>
    </div>
  );
}

function TotalCell({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span style={{ color: "#6B7280", fontSize: "11px" }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: accent ? "#1D4ED8" : "#111827", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}
