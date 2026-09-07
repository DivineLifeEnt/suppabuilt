"use client";

import type { EstimateLine } from "@/lib/estimating/types";

type Props = {
  lines: EstimateLine[];
  selectedLineIds: Set<string>;
  showInternalCosts: boolean;
  onToggleSelect: (lineId: string) => void;
  onSelectAll: () => void;
  onEditLine: (line: EstimateLine) => void;
  onDeleteLine: (lineId: string) => void;
  isReadOnly: boolean;
};

export function EstimateLineTable({
  lines, selectedLineIds, showInternalCosts,
  onToggleSelect, onSelectAll, onEditLine, onDeleteLine, isReadOnly,
}: Props) {
  const allSelected = lines.length > 0 && lines.every((l) => selectedLineIds.has(l.id));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#F9FAFB", borderBottom: "2px solid #E5E7EB" }}>
            <th style={{ padding: "8px", textAlign: "left", width: "32px" }}>
              <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
            </th>
            <th style={{ padding: "8px", textAlign: "left" }}>Description</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Category</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Unit</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Waste %</th>
            {showInternalCosts && (
              <>
                <th style={{ padding: "8px", textAlign: "right" }}>Unit Mat.</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Labor Hrs</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Rate</th>
              </>
            )}
            <th style={{ padding: "8px", textAlign: "center", width: "80px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && (
            <tr>
              <td colSpan={showInternalCosts ? 10 : 7} style={{ padding: "24px", textAlign: "center", color: "#9CA3AF" }}>
                No lines yet. Add a line to get started.
              </td>
            </tr>
          )}
          {lines.map((line) => (
            <tr
              key={line.id}
              style={{
                borderBottom: "1px solid #E5E7EB",
                background: selectedLineIds.has(line.id) ? "#EFF6FF" : (line.included ? "#fff" : "#F9FAFB"),
                opacity: line.included ? 1 : 0.6,
              }}
            >
              <td style={{ padding: "8px" }}>
                <input type="checkbox" checked={selectedLineIds.has(line.id)} onChange={() => onToggleSelect(line.id)} />
              </td>
              <td style={{ padding: "8px", fontWeight: 500 }}>{line.description}</td>
              <td style={{ padding: "8px", color: "#6B7280", fontSize: "11px" }}>{line.category}</td>
              <td style={{ padding: "8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{line.quantity}</td>
              <td style={{ padding: "8px", color: "#6B7280" }}>{line.unit}</td>
              <td style={{ padding: "8px", textAlign: "right" }}>{line.wastePercent}%</td>
              {showInternalCosts && (
                <>
                  <td style={{ padding: "8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{line.unitMaterialCost}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{line.laborHoursPerUnit}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{line.burdenedLaborRate}</td>
                </>
              )}
              <td style={{ padding: "8px", textAlign: "center", display: "flex", gap: "4px", justifyContent: "center" }}>
                {!isReadOnly && (
                  <>
                    <button onClick={() => onEditLine(line)} title="Edit" style={{ padding: "3px 8px", fontSize: "11px", border: "1px solid #D1D5DB", borderRadius: "4px", cursor: "pointer", background: "#fff" }}>
                      Edit
                    </button>
                    <button onClick={() => onDeleteLine(line.id)} title="Delete" style={{ padding: "3px 8px", fontSize: "11px", border: "1px solid #FCA5A5", borderRadius: "4px", cursor: "pointer", background: "#FEF2F2", color: "#DC2626" }}>
                      Del
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
