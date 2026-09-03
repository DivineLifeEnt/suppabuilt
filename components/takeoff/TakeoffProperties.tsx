"use client";

import { useState } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { TakeoffItem } from "@/lib/takeoff/types";

export function TakeoffProperties() {
  const { items, selectedIds, catalog, systems, zones, levels, phases, groups, updateItem, setSaveState } = useTakeoffStore();
  const [saving, setSaving] = useState(false);

  if (selectedIds.length === 0) {
    return (
      <div style={{ padding: 16, color: "var(--text-2)", fontSize: 13 }}>
        Select a takeoff item to view properties.
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div style={{ padding: 16, color: "var(--text-2)", fontSize: 13 }}>
        {selectedIds.length} items selected. Use Bulk Edit for batch changes.
      </div>
    );
  }

  const item = items[selectedIds[0]];
  if (!item) return null;
  const catItem = catalog.find((c) => c.id === item.catalogItemId);

  async function patch(field: Partial<TakeoffItem>) {
    if (!item) return;
    setSaving(true);
    setSaveState("saving");
    try {
      const res = await fetch(`/api/takeoff-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: item.revision, ...field }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = (await res.json()) as { item: TakeoffItem };
      updateItem(data.item);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
      <div style={{ fontWeight: 600 }}>{catItem?.name ?? item.catalogItemId}</div>

      <Field label="Net Quantity">
        <input
          type="number"
          defaultValue={item.netQuantity}
          onBlur={(e) => { if (e.target.value !== item.netQuantity) patch({ netQuantity: e.target.value }); }}
          style={fieldStyle}
        />
      </Field>

      <Field label="Waste %">
        <input
          type="number"
          defaultValue={item.wastePercent}
          onBlur={(e) => { if (e.target.value !== item.wastePercent) patch({ wastePercent: e.target.value }); }}
          style={fieldStyle}
        />
      </Field>

      <Field label="Gross Quantity">
        <span style={{ color: "var(--text-2)" }}>{item.grossQuantity} {item.unit}</span>
      </Field>

      <Field label="Equipment Tag">
        <input
          type="text"
          defaultValue={item.equipmentTag ?? ""}
          onBlur={(e) => patch({ equipmentTag: e.target.value || null })}
          style={fieldStyle}
        />
      </Field>

      <Field label="System">
        <select defaultValue={item.systemId ?? ""} onChange={(e) => patch({ systemId: e.target.value || null })} style={fieldStyle}>
          <option value="">— None —</option>
          {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>

      <Field label="Zone">
        <select defaultValue={item.zoneId ?? ""} onChange={(e) => patch({ zoneId: e.target.value || null })} style={fieldStyle}>
          <option value="">— None —</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </Field>

      <Field label="Level">
        <select defaultValue={item.levelId ?? ""} onChange={(e) => patch({ levelId: e.target.value || null })} style={fieldStyle}>
          <option value="">— None —</option>
          {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>

      <Field label="Phase">
        <select defaultValue={item.phaseId ?? ""} onChange={(e) => patch({ phaseId: e.target.value || null })} style={fieldStyle}>
          <option value="">— None —</option>
          {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>

      <Field label="Group">
        <select defaultValue={item.groupId ?? ""} onChange={(e) => patch({ groupId: e.target.value || null })} style={fieldStyle}>
          <option value="">— None —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Field>

      <Field label="Notes">
        <textarea
          defaultValue={item.notes ?? ""}
          rows={3}
          onBlur={(e) => patch({ notes: e.target.value || null })}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </Field>

      <Field label="Status">
        <select defaultValue={item.status} onChange={(e) => patch({ status: e.target.value as "open" | "resolved" })} style={fieldStyle}>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </Field>

      {saving && <div style={{ color: "var(--text-2)", fontSize: 11 }}>Saving…</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontWeight: 500, marginBottom: 3, color: "var(--text-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 8px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 13,
  background: "var(--surface-2)",
  color: "var(--text-1)",
  boxSizing: "border-box",
};
