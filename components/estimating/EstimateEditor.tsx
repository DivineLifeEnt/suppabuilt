"use client";

import { useState } from "react";
import type { EstimateVersion, EstimateLine } from "@/lib/estimating/types";
import { useEstimatingStore } from "@/stores/estimatingStore";
import { EstimateSectionTree } from "./EstimateSectionTree";
import { EstimateLineTable } from "./EstimateLineTable";
import { EstimateLineEditor } from "./EstimateLineEditor";
import { EstimateTotals } from "./EstimateTotals";
import { AdjustmentEditor } from "./AdjustmentEditor";

type Props = {
  version: EstimateVersion;
  projectId: string;
  currency: string;
  onRefresh: () => void;
};

const MUTABLE_STATUSES = new Set(["draft", "changes-requested"]);

export function EstimateEditor({ version, projectId: _projectId, currency, onRefresh }: Props) {
  const {
    sections, lines, totals, adjustments, selectedLineIds, expandedSectionIds,
    showInternalCosts, toggleSelectLine, selectAllLines, clearSelectedLines,
    toggleSection, setShowInternalCosts, addConflict,
  } = useEstimatingStore();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingLine, setEditingLine] = useState<EstimateLine | null | "new">(null);

  const isReadOnly = !MUTABLE_STATUSES.has(version.status);

  const visibleLines = activeSection
    ? lines.filter((l) => l.sectionId === activeSection)
    : lines;

  const handleSaveLine = async (input: Record<string, unknown>) => {
    try {
      const url = editingLine && editingLine !== "new"
        ? `/api/estimate-lines/${editingLine.id}`
        : `/api/estimate-versions/${version.id}/lines`;
      const method = editingLine && editingLine !== "new" ? "PATCH" : "POST";
      const body = { ...input, ...(method === "PATCH" && editingLine !== "new" ? { expectedRevision: (editingLine as EstimateLine).revision } : {}) };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        if (res.status === 409) addConflict(editingLine !== "new" ? (editingLine as EstimateLine).id : "new", err.error ?? "Conflict");
        return;
      }
      setEditingLine(null);
      onRefresh();
    } catch { /* ignore */ }
  };

  const handleDeleteLine = async (lineId: string) => {
    await fetch(`/api/estimate-lines/${lineId}`, { method: "DELETE" });
    onRefresh();
  };

  const handleAddSection = async (parentId: string | null) => {
    const name = window.prompt("Section name:");
    if (!name) return;
    await fetch(`/api/estimate-versions/${version.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    onRefresh();
  };

  const handleRenameSection = async (id: string) => {
    const sec = sections.find((s) => s.id === id);
    const name = window.prompt("New name:", sec?.name);
    if (!name) return;
    await fetch(`/api/estimate-sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onRefresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Section Tree */}
        <div style={{ width: "200px", borderRight: "1px solid #E5E7EB", overflowY: "auto", flexShrink: 0 }}>
          <EstimateSectionTree
            sections={sections}
            expandedIds={expandedSectionIds}
            onToggle={toggleSection}
            onAddChild={handleAddSection}
            onRename={handleRenameSection}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            isReadOnly={isReadOnly}
          />
        </div>
        {/* Main content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* Toolbar */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #E5E7EB", display: "flex", gap: "8px", alignItems: "center" }}>
            {!isReadOnly && (
              <button onClick={() => setEditingLine("new")} style={{ padding: "5px 12px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                + Add Line
              </button>
            )}
            <span style={{ fontSize: "12px", color: "#6B7280" }}>{visibleLines.length} lines</span>
            {selectedLineIds.size > 0 && (
              <span style={{ fontSize: "12px", color: "#2563EB" }}>{selectedLineIds.size} selected</span>
            )}
          </div>

          {/* Line table */}
          <div style={{ flex: 1, overflowX: "auto" }}>
            <EstimateLineTable
              lines={visibleLines}
              selectedLineIds={selectedLineIds}
              showInternalCosts={showInternalCosts}
              onToggleSelect={toggleSelectLine}
              onSelectAll={() => selectedLineIds.size === visibleLines.length ? clearSelectedLines() : selectAllLines()}
              onEditLine={setEditingLine}
              onDeleteLine={handleDeleteLine}
              isReadOnly={isReadOnly}
            />
          </div>

          {/* Adjustments */}
          <div style={{ borderTop: "1px solid #E5E7EB" }}>
            <AdjustmentEditor
              adjustments={adjustments}
              totals={totals}
              onAddAdjustment={() => { /* TODO: open adjustment form */ }}
              onRemoveAdjustment={async (id) => {
                await fetch(`/api/estimate-adjustments/${id}`, { method: "DELETE" });
                onRefresh();
              }}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      </div>

      {/* Totals bar */}
      <EstimateTotals
        totals={totals}
        showInternalCosts={showInternalCosts}
        onToggleInternal={() => setShowInternalCosts(!showInternalCosts)}
      />

      {/* Line editor overlay */}
      {editingLine !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "0", maxWidth: "540px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <EstimateLineEditor
              line={editingLine !== "new" ? editingLine : undefined}
              onSave={(input) => { void handleSaveLine(input as unknown as Record<string, unknown>); }}
              onCancel={() => setEditingLine(null)}
              currency={currency}
            />
          </div>
        </div>
      )}
    </div>
  );
}
