"use client";

import { useCallback } from "react";
import { useTakeoffStore } from "@/stores/takeoffStore";
import type { NormalizedPoint } from "@/lib/markup/types";

interface Props {
  planId: string;
  pageNumber: number;
  /** Width and height of the canvas in CSS pixels */
  canvasWidth: number;
  canvasHeight: number;
  createdBy: string;
}

export function SymbolPlacementLayer({ planId, pageNumber, canvasWidth, canvasHeight, createdBy }: Props) {
  const { tool, activeCatalogItemId, catalog, items, addItem, pushUndo, setSaveState } = useTakeoffStore();

  const activeCatalogItem = catalog.find((c) => c.id === activeCatalogItemId) ?? null;

  const handleClick = useCallback(
    async (e: React.MouseEvent<SVGSVGElement>) => {
      if (tool !== "place-symbol" && tool !== "count") return;
      if (!activeCatalogItem) return;

      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const point: NormalizedPoint = { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };

      setSaveState("saving");
      try {
        const body = {
          planId,
          pageNumber,
          catalogItemId: activeCatalogItem.id,
          source: {
            kind: "count-marker",
            markupId: `mkr-${Date.now()}`,
            point,
          },
          unit: activeCatalogItem.defaultUnit,
          netQuantity: "1",
          wastePercent: "0",
          status: "open",
          locked: false,
          visible: true,
          customFields: {},
          createdBy: { name: createdBy },
        };
        const res = await fetch(`/api/plans/${planId}/takeoff-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create takeoff item");
        const data = (await res.json()) as { item: import("@/lib/takeoff/types").TakeoffItem };
        addItem(data.item);
        pushUndo({ type: "AddItem", item: data.item });
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    },
    [tool, activeCatalogItem, planId, pageNumber, createdBy, addItem, pushUndo, setSaveState]
  );

  if (tool !== "place-symbol" && tool !== "count") return null;

  const visibleItems = Object.values(items).filter(
    (item) =>
      item.planId === planId &&
      item.pageNumber === pageNumber &&
      item.visible &&
      item.source.kind === "count-marker"
  );

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: canvasWidth,
        height: canvasHeight,
        cursor: activeCatalogItem ? "crosshair" : "not-allowed",
        pointerEvents: "all",
      }}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      onClick={handleClick}
    >
      {visibleItems.map((item) => {
        if (item.source.kind !== "count-marker") return null;
        const cx = item.source.point.x * canvasWidth;
        const cy = item.source.point.y * canvasHeight;
        const catItem = catalog.find((c) => c.id === item.catalogItemId);
        const color = catItem?.defaultColor ?? "#ff6a1a";
        const label = catItem?.abbreviation ?? "?";
        return (
          <g key={item.id}>
            <circle cx={cx} cy={cy} r={12} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}>{label.slice(0, 3)}</text>
          </g>
        );
      })}
    </svg>
  );
}
