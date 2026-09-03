"use client";

import { useMemo } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { TakeoffItem } from "@/lib/takeoff/types";

export function TakeoffListPanel() {
  const { items, catalog, selectedIds, selectOne, toggleSelect, filter, setShowListPanel, removeItem, setSaveState, pushUndo } = useTakeoffStore();

  const filteredItems = useMemo(() => {
    let list = Object.values(items);
    if (filter.systemId) list = list.filter((i) => i.systemId === filter.systemId);
    if (filter.zoneId) list = list.filter((i) => i.zoneId === filter.zoneId);
    if (filter.levelId) list = list.filter((i) => i.levelId === filter.levelId);
    if (filter.phaseId) list = list.filter((i) => i.phaseId === filter.phaseId);
    if (filter.groupId) list = list.filter((i) => i.groupId === filter.groupId);
    if (filter.status) list = list.filter((i) => i.status === filter.status);
    if (filter.pageNumber !== undefined) list = list.filter((i) => i.pageNumber === filter.pageNumber);
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [items, filter]);

  async function handleDelete(item: TakeoffItem) {
    if (item.locked) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/takeoff-items/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: item.revision }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      removeItem(item.id);
      pushUndo({ type: "DeleteItem", item });
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }

  return (
    <div style={{ width: 320, display: "flex", flexDirection: "column", background: "var(--surface-1)", borderRight: "1px solid var(--border)", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Takeoff Items ({filteredItems.length})</span>
        <button onClick={() => setShowListPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-2)" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredItems.length === 0 && (
          <p style={{ padding: "16px 12px", color: "var(--text-2)", fontSize: 13 }}>No takeoff items yet.</p>
        )}
        {filteredItems.map((item) => {
          const catItem = catalog.find((c) => c.id === item.catalogItemId);
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: isSelected ? "var(--brand-muted, #fff3ee)" : "transparent",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onClick={() => selectOne(item.id)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(item.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={{ width: 22, height: 22, borderRadius: 4, background: catItem?.defaultColor ?? "#ccc", display: "inline-block", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {catItem?.name ?? item.catalogItemId}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {item.grossQuantity} {item.unit} · {item.status}
                  {item.locked && " · 🔒"}
                </div>
              </div>
              {!item.locked && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                  title="Delete"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-2)", fontSize: 14, padding: 2 }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
