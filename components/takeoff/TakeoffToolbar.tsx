"use client";

import { useTakeoffStore, type TakeoffTool } from "@/stores/takeoffStore";

const TOOLS: { id: TakeoffTool; label: string; icon: string }[] = [
  { id: "select", label: "Select", icon: "↖" },
  { id: "place-symbol", label: "Place Symbol", icon: "＋" },
  { id: "count", label: "Count", icon: "＃" },
];

export function TakeoffToolbar() {
  const { tool, setTool, showListPanel, setShowListPanel, showSummaryPanel, setShowSummaryPanel, showCatalogBrowser, setShowCatalogBrowser, showAssemblyBrowser, setShowAssemblyBrowser, undo, redo, undoStack, redoStack, saveState } = useTakeoffStore();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--surface-1)", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
      {/* Tool selector */}
      <div style={{ display: "flex", gap: 4 }}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => setTool(t.id)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: tool === t.id ? "var(--brand)" : "var(--surface-2)",
              color: tool === t.id ? "#fff" : "var(--text-1)",
              cursor: "pointer",
              fontWeight: tool === t.id ? 600 : 400,
              fontSize: 13,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />

      {/* Undo / Redo */}
      <button disabled={undoStack.length === 0} onClick={undo} title="Undo" style={{ padding: "4px 8px", cursor: "pointer", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-1)", fontSize: 13 }}>↩</button>
      <button disabled={redoStack.length === 0} onClick={redo} title="Redo" style={{ padding: "4px 8px", cursor: "pointer", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text-1)", fontSize: 13 }}>↪</button>

      <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />

      {/* Panel toggles */}
      <button onClick={() => setShowCatalogBrowser(!showCatalogBrowser)} style={{ padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 6, background: showCatalogBrowser ? "var(--brand)" : "var(--surface-2)", color: showCatalogBrowser ? "#fff" : "var(--text-1)", cursor: "pointer", fontSize: 13 }}>Catalog</button>
      <button onClick={() => setShowAssemblyBrowser(!showAssemblyBrowser)} style={{ padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 6, background: showAssemblyBrowser ? "var(--brand)" : "var(--surface-2)", color: showAssemblyBrowser ? "#fff" : "var(--text-1)", cursor: "pointer", fontSize: 13 }}>Assemblies</button>
      <button onClick={() => setShowListPanel(!showListPanel)} style={{ padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 6, background: showListPanel ? "var(--brand)" : "var(--surface-2)", color: showListPanel ? "#fff" : "var(--text-1)", cursor: "pointer", fontSize: 13 }}>List</button>
      <button onClick={() => setShowSummaryPanel(!showSummaryPanel)} style={{ padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 6, background: showSummaryPanel ? "var(--brand)" : "var(--surface-2)", color: showSummaryPanel ? "#fff" : "var(--text-1)", cursor: "pointer", fontSize: 13 }}>Summary</button>

      <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)" }}>
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Saved"}
        {saveState === "unsaved" && "Unsaved changes"}
        {saveState === "failed" && "Save failed"}
        {saveState === "offline" && "Offline"}
      </div>
    </div>
  );
}
