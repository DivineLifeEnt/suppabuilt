"use client";

import { useState, useMemo } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";

export function AssemblyBrowser() {
  const { assemblies, catalog, activeAssemblyId, setActiveAssembly, setShowAssemblyBrowser } = useTakeoffStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return assemblies.filter((a) => a.active);
    const q = search.trim().toLowerCase();
    return assemblies.filter((a) => a.active && (a.name.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q)));
  }, [assemblies, search]);

  return (
    <div style={{ width: 280, display: "flex", flexDirection: "column", background: "var(--surface-1)", borderRight: "1px solid var(--border)", height: "100%" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Assemblies</span>
        <button onClick={() => setShowAssemblyBrowser(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-2)" }}>✕</button>
      </div>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <input
          type="search"
          placeholder="Search assemblies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface-2)", color: "var(--text-1)", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 && (
          <p style={{ padding: "16px 12px", color: "var(--text-2)", fontSize: 13 }}>No assemblies found.</p>
        )}
        {filtered.map((asm) => {
          const trigger = catalog.find((c) => c.id === asm.triggerCatalogItemId);
          const isActive = activeAssemblyId === asm.id;
          return (
            <button
              key={asm.id}
              onClick={() => setActiveAssembly(isActive ? null : asm.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                width: "100%",
                padding: "10px 12px",
                background: isActive ? "var(--brand-muted, #fff3ee)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{asm.name}</span>
              {asm.description && <span style={{ fontSize: 11, color: "var(--text-2)" }}>{asm.description}</span>}
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                Trigger: {trigger?.name ?? asm.triggerCatalogItemId} · {asm.components.length} component{asm.components.length !== 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
