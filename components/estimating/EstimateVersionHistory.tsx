"use client";

import type { EstimateVersion } from "@/lib/estimating/types";

type Props = {
  versions: EstimateVersion[];
  activeVersionId: string | null;
  onSelectVersion: (id: string) => void;
  onCreateVersion: () => void;
  canCreateVersion: boolean;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B7280", "in-review": "#D97706", "changes-requested": "#EF4444",
  approved: "#10B981", locked: "#6D28D9", superseded: "#9CA3AF", archived: "#9CA3AF",
};

export function EstimateVersionHistory({ versions, activeVersionId, onSelectVersion, onCreateVersion, canCreateVersion }: Props) {
  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>Version History</span>
        {canCreateVersion && (
          <button onClick={onCreateVersion} style={{ padding: "4px 10px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
            New Version
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {[...versions].reverse().map((v) => (
          <div
            key={v.id}
            onClick={() => onSelectVersion(v.id)}
            style={{
              padding: "8px 12px", border: `1px solid ${activeVersionId === v.id ? "#2563EB" : "#E5E7EB"}`,
              borderRadius: "6px", cursor: "pointer", background: activeVersionId === v.id ? "#EFF6FF" : "#fff",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: "13px" }}>v{v.versionNumber}</span>
              <span style={{ fontSize: "11px", color: "#6B7280", marginLeft: "8px" }}>by {v.createdBy}</span>
            </div>
            <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, background: STATUS_COLOR[v.status] ?? "#6B7280", color: "#fff" }}>
              {v.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
