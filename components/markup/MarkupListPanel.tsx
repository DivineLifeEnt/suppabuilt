"use client";

import React, { useMemo, useState } from "react";
import type { MarkupStatus, MarkupTool } from "@/lib/markup/types";
import { useMarkupStore, type MarkupFilter } from "@/stores/markupStore";

const STATUS_COLORS: Record<MarkupStatus, string> = {
  open: "#EF4444",
  pending: "#F59E0B",
  resolved: "#22C55E",
  void: "#6B7280",
};

const TOOL_ICONS: Partial<Record<MarkupTool, string>> = {
  text: "T",
  pen: "✏",
  highlighter: "◻",
  line: "—",
  arrow: "→",
  rectangle: "▭",
  ellipse: "○",
  cloud: "☁",
  checkmark: "✓",
  cross: "✕",
  pin: "📍",
};

type SortKey = "zIndex" | "createdAt" | "status" | "tool";

export function MarkupListPanel() {
  const { markups, selectedIds, selectOne, filter, setFilter } = useMarkupStore();
  const [sort, setSort] = useState<SortKey>("zIndex");

  const pageMarkups = useMemo(() => {
    let list = Object.values(markups);

    if (filter.status) list = list.filter((m) => m.status === filter.status);
    if (filter.tool) list = list.filter((m) => m.tool === filter.tool);

    list = list.sort((a, b) => {
      switch (sort) {
        case "zIndex":
          return a.zIndex - b.zIndex;
        case "createdAt":
          return a.createdAt.localeCompare(b.createdAt);
        case "status":
          return a.status.localeCompare(b.status);
        case "tool":
          return a.tool.localeCompare(b.tool);
      }
    });

    return list;
  }, [markups, filter, sort]);

  return (
    <div className="flex flex-col min-h-0">
      {/* Filter row */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 flex-wrap">
        <select
          value={filter.status ?? ""}
          onChange={(e) =>
            setFilter({ ...filter, status: (e.target.value as MarkupStatus) || undefined })
          }
          className="flex-1 min-w-0 bg-white/5 border border-white/10 text-[11px] text-gray-300 rounded px-1.5 py-1"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="void">Void</option>
        </select>
        <select
          value={filter.tool ?? ""}
          onChange={(e) =>
            setFilter({ ...filter, tool: (e.target.value as MarkupTool) || undefined })
          }
          className="flex-1 min-w-0 bg-white/5 border border-white/10 text-[11px] text-gray-300 rounded px-1.5 py-1"
        >
          <option value="">All tools</option>
          {(["text", "pen", "highlighter", "line", "arrow", "rectangle", "ellipse", "cloud", "checkmark", "cross", "pin"] as MarkupTool[]).map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-white/5 border border-white/10 text-[11px] text-gray-300 rounded px-1.5 py-1"
        >
          <option value="zIndex">Z-order</option>
          <option value="createdAt">Newest</option>
          <option value="status">Status</option>
          <option value="tool">Tool</option>
        </select>
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-600 uppercase font-semibold">
          Markups ({pageMarkups.length})
        </span>
        {(filter.status || filter.tool) && (
          <button
            onClick={() => setFilter({})}
            className="text-[10px] text-blue-400 hover:text-blue-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {pageMarkups.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-gray-600 text-center">
            No markups{filter.status || filter.tool ? " match filters" : ""}.<br />
            Use the toolbar to annotate.
          </p>
        )}
        {pageMarkups.map((m) => (
          <button
            key={m.id}
            onClick={() => selectOne(m.id)}
            className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors hover:bg-white/5 ${
              selectedIds.includes(m.id) ? "bg-blue-500/10" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: STATUS_COLORS[m.status] }}
              />
              <span className="text-[11px] text-gray-500 w-4 text-center">
                {TOOL_ICONS[m.tool] ?? m.tool[0].toUpperCase()}
              </span>
              <span className="text-[12px] text-gray-300 capitalize font-medium flex-1 truncate">
                {m.label ?? m.tool}
              </span>
              {m.locked && <span className="text-[10px] text-yellow-500">🔒</span>}
              {!m.visible && <span className="text-[10px] text-gray-600">hidden</span>}
            </div>
            {m.comment && (
              <p className="text-[11px] text-gray-500 mt-0.5 truncate ml-6">
                {m.comment}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
