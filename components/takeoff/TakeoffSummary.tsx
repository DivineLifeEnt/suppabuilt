"use client";

import { useState, useEffect } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";

interface SummaryRow {
  catalogItemId: string;
  unit: string;
  totalNetQuantity: string;
  totalGrossQuantity: string;
  itemCount: number;
}

interface SummaryData {
  rows: SummaryRow[];
}

interface Props {
  planId: string;
}

export function TakeoffSummary({ planId }: Props) {
  const { setShowSummaryPanel, catalog } = useTakeoffStore();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!planId) return;
    setLoading(true);
    fetch(`/api/plans/${planId}/takeoff-summary`)
      .then((r) => r.json())
      .then((d) => setSummary(d as SummaryData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [planId]);

  return (
    <div style={{ width: 360, display: "flex", flexDirection: "column", background: "var(--surface-1)", borderLeft: "1px solid var(--border)", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Takeoff Summary</span>
        <button onClick={() => setShowSummaryPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-2)" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && <p style={{ padding: "16px 12px", color: "var(--text-2)", fontSize: 13 }}>Loading…</p>}
        {!loading && summary && summary.rows.length === 0 && (
          <p style={{ padding: "16px 12px", color: "var(--text-2)", fontSize: 13 }}>No takeoff items yet.</p>
        )}
        {!loading && summary && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th style={th}>Item</th>
                <th style={th}>Unit</th>
                <th style={th}>Net Qty</th>
                <th style={th}>Gross Qty</th>
                <th style={th}>Count</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row, i) => {
                const catItem = catalog.find((c) => c.id === row.catalogItemId);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={td}>{catItem?.name ?? row.catalogItemId}</td>
                    <td style={td}>{row.unit}</td>
                    <td style={{ ...td, textAlign: "right" }}>{Number(row.totalNetQuantity).toFixed(2)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{Number(row.totalGrossQuantity).toFixed(2)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{row.itemCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "6px 8px", color: "var(--text-1)" };
