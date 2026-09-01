"use client";

import { useStudioStore } from "@/lib/store";
import { hvacSymbols } from "@/lib/hvacSymbols";

const STATUS_COLORS: Record<string, string> = {
  open: "#EF4444",
  pending: "#F59E0B",
  resolved: "#22C55E",
  void: "#6B7280",
};

export default function MarkupPanel() {
  const {
    markups, selectedId, setSelectedId, updateMarkup, deleteMarkup,
    tool, selectedEquipmentId, setSelectedEquipmentId, counts, incrementCount, decrementCount,
    showMarkupPanel, setShowMarkupPanel,
  } = useStudioStore();

  const selected = markups.find(m => m.id === selectedId);
  const pageMarkups = markups.filter(m => m.status !== "void");

  if (!showMarkupPanel) {
    return (
      <button
        onClick={() => setShowMarkupPanel(true)}
        className="w-8 bg-[#191d21] border-l border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0"
      >
        ‹
      </button>
    );
  }

  return (
    <div className="w-72 bg-[#191d21] border-l border-white/10 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-gray-300">
          {tool === "equipment" ? "HVAC Equipment" : tool === "count" ? "Count Tool" : "Markup Panel"}
        </span>
        <button onClick={() => setShowMarkupPanel(false)} className="text-gray-600 hover:text-white text-sm">›</button>
      </div>

      {/* Equipment symbol picker */}
      {(tool === "equipment" || tool === "count") && (
        <div className="p-3 border-b border-white/10">
          <p className="text-[11px] text-gray-500 uppercase font-semibold mb-2">Select Equipment</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {hvacSymbols.map((sym) => (
              <button
                key={sym.id}
                onClick={() => setSelectedEquipmentId(sym.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-colors ${
                  selectedEquipmentId === sym.id ? "bg-blue-500/20 border border-blue-500/50" : "hover:bg-white/5"
                }`}
              >
                <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: sym.color + "22", color: sym.color, border: `1px solid ${sym.color}44` }}>
                  {sym.abbreviation.slice(0, 3)}
                </div>
                <div>
                  <p className="text-[12px] text-white">{sym.name}</p>
                  <p className="text-[10px] text-gray-500">{sym.abbreviation}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Count summary */}
      {tool === "count" && counts.length > 0 && (
        <div className="p-3 border-b border-white/10">
          <p className="text-[11px] text-gray-500 uppercase font-semibold mb-2">Takeoff Summary</p>
          {counts.map((c) => (
            <div key={c.equipmentId} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center"
                  style={{ background: c.color + "22", color: c.color }}>
                  {c.abbreviation.slice(0, 2)}
                </div>
                <span className="text-[12px] text-gray-300">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decrementCount(c.equipmentId)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-xs">−</button>
                <span className="text-[13px] font-bold text-white w-8 text-center">{c.count}</span>
                <button onClick={() => incrementCount(c.equipmentId, c.name, c.abbreviation, c.color)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-xs">+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected markup detail */}
      {selected && (
        <div className="p-3 border-b border-white/10">
          <p className="text-[11px] text-gray-500 uppercase font-semibold mb-2">Selected Markup</p>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-600 uppercase">Status</label>
              <div className="flex gap-1 mt-1">
                {["open", "pending", "resolved", "void"].map((s) => (
                  <button key={s} onClick={() => updateMarkup(selected.id, { status: s as any })}
                    className={`flex-1 py-1 text-[10px] rounded capitalize transition-colors ${
                      selected.status === s ? "text-white font-semibold" : "text-gray-500 bg-white/5 hover:bg-white/10"
                    }`}
                    style={selected.status === s ? { background: STATUS_COLORS[s] } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase">Comment</label>
              <textarea
                value={selected.comment || ""}
                onChange={e => updateMarkup(selected.id, { comment: e.target.value })}
                rows={3}
                placeholder="Add comment..."
                className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[12px] text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-600 uppercase">Assigned To</label>
              <input
                value={selected.assignedTo || ""}
                onChange={e => updateMarkup(selected.id, { assignedTo: e.target.value })}
                placeholder="Name or initials"
                className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <button onClick={() => deleteMarkup(selected.id)} className="w-full py-1.5 text-[11px] text-red-400 bg-red-400/5 hover:bg-red-400/10 rounded transition-colors">
              Delete Markup
            </button>
          </div>
        </div>
      )}

      {/* Markup list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex items-center justify-between sticky top-0 bg-[#191d21] border-b border-white/5">
          <span className="text-[11px] text-gray-500 uppercase font-semibold">All Markups ({pageMarkups.length})</span>
        </div>
        {pageMarkups.length === 0 && (
          <p className="px-4 py-6 text-[12px] text-gray-600 text-center">No markups yet.<br />Use the toolbar to add annotations.</p>
        )}
        {pageMarkups.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
            className={`w-full text-left px-4 py-2.5 border-b border-white/5 transition-colors ${
              m.id === selectedId ? "bg-blue-500/10" : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[m.status] }} />
              <span className="text-[12px] text-gray-300 capitalize font-medium">{m.type}</span>
              <span className="ml-auto text-[10px] text-gray-600">P{m.page}</span>
            </div>
            {m.comment && <p className="text-[11px] text-gray-500 mt-0.5 truncate ml-4">{m.comment}</p>}
            {m.measurementFt != null && (
              <p className="text-[11px] text-blue-400 mt-0.5 ml-4 font-mono">{m.measurementFt.toFixed(1)} ft</p>
            )}
            {m.equipmentId && (
              <p className="text-[11px] text-purple-400 mt-0.5 ml-4">
                {hvacSymbols.find(s => s.id === m.equipmentId)?.name || m.equipmentId}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
