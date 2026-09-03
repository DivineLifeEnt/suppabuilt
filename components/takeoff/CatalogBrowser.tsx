"use client";

import { useState, useMemo } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { HvacCatalogItem, HvacCategory } from "@/lib/takeoff/types";

const CATEGORIES: HvacCategory[] = [
  "equipment", "air-devices", "ductwork", "duct-fittings", "dampers",
  "controls", "refrigerant-piping", "hydronic-piping", "condensate-drains",
  "insulation", "supports-hangers", "accessories", "other",
];

export function CatalogBrowser() {
  const { catalog, activeCatalogItemId, setActiveCatalogItem, setTool, setShowCatalogBrowser } = useTakeoffStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<HvacCategory | "">("");

  const filtered = useMemo(() => {
    let items: HvacCatalogItem[] = catalog.filter((i) => i.active);
    if (category) items = items.filter((i) => i.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.abbreviation.toLowerCase().includes(q) ||
          i.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return items;
  }, [catalog, search, category]);

  function handleSelect(item: HvacCatalogItem) {
    setActiveCatalogItem(item.id);
    setTool("place-symbol");
  }

  return (
    <div style={{ width: 260, display: "flex", flexDirection: "column", background: "var(--surface-1)", borderRight: "1px solid var(--border)", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Catalog</span>
        <button onClick={() => setShowCatalogBrowser(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-2)" }}>✕</button>
      </div>
      <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          type="search"
          placeholder="Search catalog…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface-2)", color: "var(--text-1)" }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as HvacCategory | "")}
          style={{ padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface-2)", color: "var(--text-1)" }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <p style={{ padding: "16px 12px", color: "var(--text-2)", fontSize: 13 }}>No items found.</p>
        )}
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "8px 12px",
              background: activeCatalogItemId === item.id ? "var(--brand-muted, #fff3ee)" : "transparent",
              border: "none",
              borderBottom: "1px solid var(--border)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ width: 28, height: 28, borderRadius: 6, background: item.defaultColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {item.defaultSymbol ?? item.abbreviation.slice(0, 2)}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{item.category} · {item.defaultUnit}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
