"use client";

import React from "react";
import { useMeasurementStore } from "@/stores/measurementStore";
import type { MeasurementTool } from "@/lib/measurement/types";

interface ToolDef {
  tool: MeasurementTool;
  label: string;
  icon: string;
  title: string;
}

const TOOLS: ToolDef[] = [
  { tool: "calibrate",      icon: "⚖",  label: "Calibrate",  title: "Set scale calibration" },
  { tool: "linear",         icon: "↔",  label: "Linear",     title: "Measure linear distance" },
  { tool: "polyline",       icon: "〜",  label: "Polyline",   title: "Measure multi-segment path" },
  { tool: "perimeter",      icon: "□",  label: "Perimeter",  title: "Measure closed perimeter" },
  { tool: "polygon-area",   icon: "⬟",  label: "Area",       title: "Measure polygon area" },
  { tool: "rectangle-area", icon: "▬",  label: "Rectangle",  title: "Measure rectangular area" },
  { tool: "volume",         icon: "⬡",  label: "Volume",     title: "Measure volume (area × depth)" },
  { tool: "radius",         icon: "◌",  label: "Radius",     title: "Measure radius" },
  { tool: "diameter",       icon: "◎",  label: "Diameter",   title: "Measure diameter" },
  { tool: "angle",          icon: "∠",  label: "Angle",      title: "Measure angle" },
  { tool: "count",          icon: "#",  label: "Count",      title: "Count items" },
];

export function MeasurementToolbar() {
  const { activeTool, setTool, snapSettings, setSnapSettings } = useMeasurementStore();

  return (
    <div
      className="flex items-center gap-0.5 border-b border-t border-[#222c36] bg-[#0d131a] px-2 py-1"
      role="toolbar"
      aria-label="Measurement tools"
    >
      <span className="mr-1.5 shrink-0 text-[9px] font-bold tracking-[.16em] text-[#ff7a32]">MEASURE</span>
      <div className="h-4 w-px bg-[#27313c] mx-1" />

      {TOOLS.map(({ tool, icon, label, title }) => (
        <button
          key={tool}
          title={title}
          aria-pressed={activeTool === tool}
          onClick={() => setTool(activeTool === tool ? null : tool)}
          className={[
            "tool-button !flex !flex-col !h-auto !min-w-0 !px-2 !py-1 gap-0.5 text-center",
            activeTool === tool
              ? "!bg-[#ff6a1a]/15 !text-[#ff7a32] !border-[#ff6a1a]/40"
              : "",
          ].join(" ")}
        >
          <span className="text-[14px] leading-none">{icon}</span>
          <span className="text-[9px] leading-none tracking-[.04em]">{label}</span>
        </button>
      ))}

      <div className="h-4 w-px bg-[#27313c] mx-1" />

      {/* Snap toggle */}
      <button
        title={`Snap ${snapSettings.enabled ? "on" : "off"} (S)`}
        aria-pressed={snapSettings.enabled}
        onClick={() => setSnapSettings({ enabled: !snapSettings.enabled })}
        className={[
          "tool-button !flex !flex-col !h-auto !min-w-0 !px-2 !py-1 gap-0.5 text-center",
          snapSettings.enabled ? "!bg-[#ff6a1a]/15 !text-[#ff7a32] !border-[#ff6a1a]/40" : "",
        ].join(" ")}
      >
        <span className="text-[14px] leading-none">⊕</span>
        <span className="text-[9px] leading-none tracking-[.04em]">Snap</span>
      </button>
    </div>
  );
}
