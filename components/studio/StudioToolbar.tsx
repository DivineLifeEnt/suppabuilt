"use client";

import { useStudioStore, type Tool } from "@/lib/store";

const TOOL_GROUPS: { label: string; tools: { id: Tool; label: string; icon: string }[] }[] = [
  {
    label: "Select",
    tools: [
      { id: "select", label: "Select", icon: "↖" },
      { id: "pan", label: "Pan", icon: "✋" },
    ],
  },
  {
    label: "Markup",
    tools: [
      { id: "text", label: "Text", icon: "T" },
      { id: "highlight", label: "Highlight", icon: "◻" },
      { id: "cloud", label: "Cloud", icon: "☁" },
      { id: "rectangle", label: "Rectangle", icon: "▭" },
      { id: "circle", label: "Circle", icon: "○" },
      { id: "arrow", label: "Arrow", icon: "→" },
      { id: "freehand", label: "Pen", icon: "✏" },
    ],
  },
  {
    label: "Measure",
    tools: [
      { id: "calibrate", label: "Calibrate", icon: "⇔" },
      { id: "length", label: "Length", icon: "📏" },
      { id: "area", label: "Area", icon: "⬡" },
      { id: "count", label: "Count", icon: "#" },
    ],
  },
  {
    label: "HVAC",
    tools: [
      { id: "equipment", label: "Equipment", icon: "⚙" },
    ],
  },
];

const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#FFFFFF"];

export default function StudioToolbar() {
  const { tool, setTool, activeColor, setActiveColor, strokeWidth, setStrokeWidth, calibrated, zoom, setZoom } =
    useStudioStore();

  return (
    <div className="h-12 bg-[#191d21] border-b border-white/10 flex items-center px-3 gap-3 overflow-x-auto shrink-0">
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          {gi > 0 && <div className="w-px h-6 bg-white/10 mx-1" />}
          {group.tools.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTool(t.id)}
              className={`relative px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                tool === t.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-[13px]">{t.icon}</span>
              <span className="text-[12px] hidden sm:inline">{t.label}</span>
              {t.id === "calibrate" && calibrated && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400" />
              )}
            </button>
          ))}
        </div>
      ))}

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Color picker */}
      <div className="flex items-center gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setActiveColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === c ? "border-white scale-110" : "border-transparent"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Stroke width */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">Width</span>
        {[1, 2, 3, 5].map((w) => (
          <button
            key={w}
            onClick={() => setStrokeWidth(w)}
            className={`w-7 h-6 flex items-center justify-center rounded text-[11px] transition-colors ${
              strokeWidth === w ? "bg-blue-500 text-white" : "text-gray-400 hover:bg-white/10"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button onClick={() => setZoom(Math.max(0.25, zoom - 0.25))} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded text-sm">−</button>
        <span className="text-[12px] text-gray-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded text-sm">+</button>
        <button onClick={() => setZoom(1)} className="px-2 h-6 text-[11px] text-gray-500 hover:text-white hover:bg-white/10 rounded">Fit</button>
      </div>
    </div>
  );
}
