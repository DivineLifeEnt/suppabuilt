"use client";

import { useState } from "react";

type TakeoffGroup = { id: string; name: string; itemCount?: number };

type Props = {
  groups: TakeoffGroup[];
  onConfirm: (groupIds: string[]) => void;
  onClose: () => void;
};

export function TakeoffConversionDialog({ groups, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: "10px", padding: "24px", maxWidth: "500px", width: "90%" }}>
        <h2 style={{ margin: "0 0 16px" }}>Import from Takeoff</h2>
        <p style={{ color: "#6B7280", fontSize: "13px", marginBottom: "12px" }}>
          Select takeoff groups to import as estimate lines.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
          {groups.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", border: "1px solid #E5E7EB", borderRadius: "4px" }}>
              <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)} />
              <span style={{ flex: 1, fontSize: "13px" }}>{g.name}</span>
              {g.itemCount !== undefined && <span style={{ fontSize: "11px", color: "#6B7280" }}>{g.itemCount} items</span>}
            </div>
          ))}
          {groups.length === 0 && <div style={{ color: "#9CA3AF", fontSize: "13px" }}>No takeoff groups found.</div>}
        </div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", background: "#fff" }}>Cancel</button>
          <button
            onClick={() => { if (selected.size > 0) onConfirm([...selected]); }}
            disabled={selected.size === 0}
            style={{ padding: "8px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", cursor: selected.size === 0 ? "not-allowed" : "pointer", opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            Import {selected.size > 0 ? `(${selected.size} groups)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
