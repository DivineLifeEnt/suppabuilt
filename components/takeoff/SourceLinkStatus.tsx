"use client";

import { useTakeoffStore } from "@/stores/takeoffStore";
import type { TakeoffSource } from "@/lib/takeoff/types";

function sourceLabel(source: TakeoffSource): string {
  switch (source.kind) {
    case "manual": return "Manual entry";
    case "count-marker": return `Count marker (markup ${source.markupId.slice(0, 8)}…)`;
    case "measurement": return `Measurement (${source.measurementId.slice(0, 8)}…)`;
    case "assembly": return `Assembly component`;
  }
}

function sourceBadgeColor(source: TakeoffSource): string {
  switch (source.kind) {
    case "manual": return "#94a3b8";
    case "count-marker": return "#f59e0b";
    case "measurement": return "#3b82f6";
    case "assembly": return "#10b981";
  }
}

interface Props {
  itemId: string;
  onDetach?: () => void;
}

export function SourceLinkStatus({ itemId, onDetach }: Props) {
  const { items, updateItem, setSaveState } = useTakeoffStore();
  const item = items[itemId];
  if (!item) return null;

  async function handleDetach() {
    if (!item) return;
    const reason = prompt("Reason for detaching source link?");
    if (reason === null) return; // cancelled
    setSaveState("saving");
    try {
      const res = await fetch(`/api/takeoff-items/${item.id}/detach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Manual detach" }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { item: typeof item };
      updateItem(data.item);
      setSaveState("saved");
      onDetach?.();
    } catch {
      setSaveState("failed");
    }
  }

  const color = sourceBadgeColor(item.source);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--surface-2)", borderRadius: 8, fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ flex: 1, color: "var(--text-1)" }}>{sourceLabel(item.source)}</span>
      {item.source.kind !== "manual" && (
        <button
          onClick={handleDetach}
          title="Detach source link"
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "2px 6px", color: "var(--text-2)" }}
        >
          Detach
        </button>
      )}
    </div>
  );
}
