"use client";

import { useState } from "react";

interface Props {
  planId: string;
  onClose: () => void;
}

export function TakeoffExportDialog({ planId, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "csv" | "xlsx") {
    setExporting(true);
    setError(null);
    try {
      const url = format === "csv"
        ? `/api/plans/${planId}/takeoff-export.csv`
        : `/api/plans/${planId}/takeoff-export.xlsx`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `takeoff-${planId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ background: "var(--surface-1)", borderRadius: 12, padding: 28, width: 360, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Export Takeoff</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-2)" }}>✕</button>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)" }}>
          Export all takeoff items for this plan. The file will be downloaded to your computer.
        </p>

        {error && <p style={{ margin: 0, color: "#ef4444", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            disabled={exporting}
            onClick={() => download("csv")}
            style={{ padding: "10px 18px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, background: "var(--surface-2)", color: "var(--text-1)", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ textAlign: "left" }}>
              <div>Export as CSV</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>Comma-separated values, opens in Excel or Google Sheets</div>
            </div>
          </button>

          <button
            disabled={exporting}
            onClick={() => download("xlsx")}
            style={{ padding: "10px 18px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, background: "var(--surface-2)", color: "var(--text-1)", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span style={{ fontSize: 20 }}>📊</span>
            <div style={{ textAlign: "left" }}>
              <div>Export as XLSX</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>Excel workbook with Summary and Detail sheets</div>
            </div>
          </button>
        </div>

        {exporting && <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)" }}>Preparing export…</p>}

        <button onClick={onClose} style={{ padding: "7px 14px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 13, background: "transparent", color: "var(--text-2)", alignSelf: "flex-end" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
