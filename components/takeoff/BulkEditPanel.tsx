"use client";

import { useState } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { TakeoffItem } from "@/lib/takeoff/types";

export function BulkEditPanel() {
  const { selectedIds, items, systems, zones, levels, phases, groups, updateItem, setSaveState } = useTakeoffStore();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [wastePercent, setWastePercent] = useState("");
  const [systemId, setSystemId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState<"" | "open" | "resolved">("");

  if (selectedIds.length < 2) return null;

  async function apply() {
    setSaving(true);
    setDone(false);
    setSaveState("saving");
    const patch: Record<string, unknown> = {};
    if (wastePercent) patch.wastePercent = wastePercent;
    if (systemId) patch.systemId = systemId === "__clear__" ? null : systemId;
    if (zoneId) patch.zoneId = zoneId === "__clear__" ? null : zoneId;
    if (levelId) patch.levelId = levelId === "__clear__" ? null : levelId;
    if (phaseId) patch.phaseId = phaseId === "__clear__" ? null : phaseId;
    if (groupId) patch.groupId = groupId === "__clear__" ? null : groupId;
    if (status) patch.status = status;

    try {
      const results = await Promise.allSettled(
        selectedIds.map(async (id) => {
          const item = items[id];
          if (!item || item.locked) return;
          const res = await fetch(`/api/takeoff-items/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expectedRevision: item.revision, ...patch }),
          });
          if (!res.ok) throw new Error("Failed");
          const data = (await res.json()) as { item: TakeoffItem };
          updateItem(data.item);
        })
      );
      const failures = results.filter((r) => r.status === "rejected").length;
      if (failures > 0) setSaveState("failed");
      else setSaveState("saved");
      setDone(true);
    } catch {
      setSaveState("failed");
    } finally {
      setSaving(false);
    }
  }

  const sel = (label: string, value: string, onChange: (v: string) => void, options: { id: string; name: string }[]) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">— No change —</option>
        <option value="__clear__">Clear</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 100, background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, width: 480, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Bulk Edit — {selectedIds.length} items selected</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={labelStyle}>Waste %</label>
          <input type="number" min={0} max={100} value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} placeholder="No change" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as "" | "open" | "resolved")} style={inputStyle}>
            <option value="">— No change —</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        {sel("System", systemId, setSystemId, systems)}
        {sel("Zone", zoneId, setZoneId, zones)}
        {sel("Level", levelId, setLevelId, levels)}
        {sel("Phase", phaseId, setPhaseId, phases)}
        {sel("Group", groupId, setGroupId, groups)}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {done && <span style={{ fontSize: 12, color: "var(--text-2)", alignSelf: "center" }}>Done!</span>}
        <button onClick={apply} disabled={saving} style={{ padding: "7px 18px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, background: "var(--brand, #ff6a1a)", color: "#fff" }}>
          {saving ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, background: "var(--surface-2)", color: "var(--text-1)", boxSizing: "border-box" };
