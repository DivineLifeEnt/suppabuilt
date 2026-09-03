"use client";

import { useState } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { TakeoffItem } from "@/lib/takeoff/types";

interface PreviewComponent {
  catalogItemId: string;
  unit: string;
  netQuantity: string;
  grossQuantity: string;
}

interface Props {
  assemblyId: string;
  planId: string;
  pageNumber: number;
  appliedBy: string;
  onClose: () => void;
  onApplied: (items: TakeoffItem[]) => void;
}

export function AssemblyPreviewDialog({ assemblyId, planId, pageNumber, appliedBy, onClose, onApplied }: Props) {
  const { catalog, assemblies, addItem, pushUndo } = useTakeoffStore();
  const assembly = assemblies.find((a) => a.id === assemblyId);

  const [sourceCount, setSourceCount] = useState<string>("1");
  const [sourceLengthFt, setSourceLengthFt] = useState<string>("");
  const [preview, setPreview] = useState<PreviewComponent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (sourceCount) body.sourceCount = parseInt(sourceCount, 10);
      if (sourceLengthFt) body.sourceLengthMm = parseFloat(sourceLengthFt) * 304.8;
      const res = await fetch(`/api/hvac/assemblies/${assemblyId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Preview failed");
      const data = (await res.json()) as { preview: PreviewComponent[] };
      setPreview(data.preview);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { planId, pageNumber, appliedBy };
      if (sourceCount) body.sourceCount = parseInt(sourceCount, 10);
      if (sourceLengthFt) body.sourceLengthMm = parseFloat(sourceLengthFt) * 304.8;
      const res = await fetch(`/api/hvac/assemblies/${assemblyId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Apply failed");
      const data = (await res.json()) as { items: TakeoffItem[] };
      for (const item of data.items) addItem(item);
      pushUndo({ type: "BatchAdd", items: data.items });
      onApplied(data.items);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setApplying(false);
    }
  }

  if (!assembly) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 24, width: 480, maxHeight: "80vh", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Apply Assembly: {assembly.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-2)" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={labelStyle}>Source Count</label>
          <input type="number" min={1} value={sourceCount} onChange={(e) => setSourceCount(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Source Length (ft, optional)</label>
          <input type="number" min={0} step={0.5} value={sourceLengthFt} onChange={(e) => setSourceLengthFt(e.target.value)} style={inputStyle} placeholder="e.g. 12.5" />
        </div>

        <button onClick={handlePreview} disabled={loading} style={btnStyle}>
          {loading ? "Previewing…" : "Preview"}
        </button>

        {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

        {preview && (
          <div>
            <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13 }}>Preview ({preview.length} item{preview.length !== 1 ? "s" : ""})</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Item</th>
                  <th style={th}>Unit</th>
                  <th style={th}>Net</th>
                  <th style={th}>Gross</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => {
                  const cat = catalog.find((c) => c.id === row.catalogItemId);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={td}>{cat?.name ?? row.catalogItemId}</td>
                      <td style={td}>{row.unit}</td>
                      <td style={{ ...td, textAlign: "right" }}>{Number(row.netQuantity).toFixed(3)}</td>
                      <td style={{ ...td, textAlign: "right" }}>{Number(row.grossQuantity).toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text-1)" }}>Cancel</button>
          <button onClick={handleApply} disabled={applying} style={{ ...btnStyle, background: "var(--brand, #ff6a1a)" }}>
            {applying ? "Applying…" : "Apply to Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em" };
const inputStyle: React.CSSProperties = { padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface-2)", color: "var(--text-1)", width: "100%", boxSizing: "border-box" };
const btnStyle: React.CSSProperties = { padding: "7px 16px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, background: "var(--surface-2)", color: "var(--text-1)" };
const th: React.CSSProperties = { padding: "4px 6px", textAlign: "left", fontWeight: 600, color: "var(--text-2)", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "4px 6px", color: "var(--text-1)" };
