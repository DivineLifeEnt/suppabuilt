"use client";

import { useState } from "react";
import type { ExportType } from "@/lib/estimating/types";

const EXPORT_TYPES: Array<{ value: ExportType; label: string; internal: boolean }> = [
  { value: "estimate-internal-xlsx", label: "Estimate (Internal XLSX)", internal: true },
  { value: "estimate-customer-pdf", label: "Estimate (Customer PDF)", internal: false },
  { value: "estimate-detail-pdf", label: "Estimate Detail PDF", internal: true },
  { value: "estimate-csv", label: "Estimate CSV", internal: true },
  { value: "takeoff-xlsx", label: "Takeoff XLSX", internal: true },
  { value: "takeoff-csv", label: "Takeoff CSV", internal: true },
  { value: "markup-report-pdf", label: "Markup Report PDF", internal: true },
  { value: "measurement-report-xlsx", label: "Measurement Report XLSX", internal: true },
  { value: "flattened-plan-pdf", label: "Flattened Plan PDF", internal: true },
];

type Props = {
  versionId?: string;
  projectId: string;
  sourceIds: string[];
  canCreateCustomer: boolean;
  onSubmit: (args: { exportType: ExportType; versionId: string | undefined; includeInternal: boolean; idempotencyKey: string }) => void;
  onClose: () => void;
};

export function ExportDialog({ versionId, projectId, sourceIds, canCreateCustomer, onSubmit, onClose }: Props) {
  const [exportType, setExportType] = useState<ExportType>("estimate-internal-xlsx");
  const [includeInternal, setIncludeInternal] = useState(true);
  void projectId; void sourceIds;

  const selectedTypeConfig = EXPORT_TYPES.find((t) => t.value === exportType);

  const handleSubmit = () => {
    const idempotencyKey = `export-${exportType}-${versionId ?? "none"}-${Date.now()}`;
    onSubmit({ exportType, versionId, includeInternal, idempotencyKey });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", maxWidth: "480px", width: "90%" }}>
        <h2 style={{ margin: "0 0 16px" }}>Export</h2>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>Export Type</label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as ExportType)}
            style={{ width: "100%", padding: "8px", border: "1px solid #D1D5DB", borderRadius: "4px", fontSize: "13px" }}
          >
            {EXPORT_TYPES.filter((t) => !t.internal || canCreateCustomer || t.internal).map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {selectedTypeConfig && !selectedTypeConfig.internal && (
          <div style={{ padding: "8px 12px", background: "#FEF3C7", borderRadius: "4px", marginBottom: "12px", fontSize: "12px", color: "#92400E" }}>
            Customer-facing export: unit costs and internal data will be excluded.
          </div>
        )}
        {canCreateCustomer && selectedTypeConfig?.internal && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <input type="checkbox" id="includeInternal" checked={includeInternal} onChange={(e) => setIncludeInternal(e.target.checked)} />
            <label htmlFor="includeInternal" style={{ fontSize: "13px" }}>Include internal costs and rates</label>
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>
            Create Export Job
          </button>
        </div>
      </div>
    </div>
  );
}
