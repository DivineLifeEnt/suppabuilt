"use client";

import { useState } from "react";
import type { SourceRefreshPreview as Preview } from "@/server/estimating/source-refresh-service";

type Props = {
  preview: Preview;
  onApply: (selectedIds: string[]) => void;
  onClose: () => void;
};

export function SourceRefreshPreviewModal({ preview, onApply, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const c of preview.changed) s.add(c.snapshotId);
    return s;
  });

  const toggleId = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", maxWidth: "600px", width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 16px" }}>Source Refresh Preview</h2>
        {preview.added.length > 0 && (
          <section>
            <h4 style={{ color: "#10B981" }}>Added ({preview.added.length})</h4>
            {preview.added.map((a) => (
              <div key={a.takeoffItemId} style={{ padding: "4px 8px", background: "#ECFDF5", borderRadius: "4px", marginBottom: "4px", fontSize: "12px" }}>
                {a.description} — {a.quantity} {a.unit}
              </div>
            ))}
          </section>
        )}
        {preview.removed.length > 0 && (
          <section>
            <h4 style={{ color: "#EF4444" }}>Removed ({preview.removed.length})</h4>
            {preview.removed.map((r) => (
              <div key={r.snapshotId} style={{ padding: "4px 8px", background: "#FEF2F2", borderRadius: "4px", marginBottom: "4px", fontSize: "12px" }}>
                {r.description}
              </div>
            ))}
          </section>
        )}
        {preview.changed.length > 0 && (
          <section>
            <h4 style={{ color: "#D97706" }}>Changed ({preview.changed.length})</h4>
            {preview.changed.map((c) => (
              <div key={c.snapshotId} style={{ padding: "4px 8px", background: "#FFFBEB", borderRadius: "4px", marginBottom: "4px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <input type="checkbox" checked={selected.has(c.snapshotId)} onChange={() => toggleId(c.snapshotId)} />
                <span>{c.description}: {c.oldQty} {c.oldUnit} → {c.newQty} {c.newUnit}</span>
              </div>
            ))}
          </section>
        )}
        <div style={{ color: "#6B7280", fontSize: "12px" }}>Unchanged: {preview.unchanged}</div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button
            onClick={() => onApply([...selected])}
            disabled={selected.size === 0}
            style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", cursor: selected.size === 0 ? "not-allowed" : "pointer", opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            Apply Selected ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
