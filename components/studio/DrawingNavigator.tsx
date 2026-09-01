"use client";

import { useStudioStore } from "@/lib/store";

interface Props {
  drawingTitle?: string;
  drawings?: { id: string; drawingNumber?: string; title: string; discipline?: string }[];
  onDrawingSelect?: (id: string) => void;
  activeDrawingId?: string;
}

export default function DrawingNavigator({ drawingTitle, drawings, onDrawingSelect, activeDrawingId }: Props) {
  const { activePage, totalPages, setPage, markups, counts } = useStudioStore();

  return (
    <div className="w-64 bg-[#191d21] border-r border-white/10 flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Drawing Set</p>
        {drawingTitle && <p className="text-[13px] text-white font-medium mt-1 truncate">{drawingTitle}</p>}
      </div>

      {/* Drawings list */}
      {drawings && drawings.length > 0 && (
        <div className="border-b border-white/10">
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500 uppercase">Plans</span>
            <span className="text-[11px] text-gray-600">{drawings.length}</span>
          </div>
          <div className="overflow-y-auto max-h-48">
            {drawings.map((d) => (
              <button
                key={d.id}
                onClick={() => onDrawingSelect?.(d.id)}
                className={`w-full text-left px-4 py-2 text-[12px] transition-colors border-l-2 ${
                  d.id === activeDrawingId
                    ? "bg-blue-500/10 border-blue-500 text-white"
                    : "border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="font-mono text-[11px] text-gray-500">{d.drawingNumber || "—"}</span>
                <span className="ml-2 truncate">{d.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Page navigation */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Page</p>
          <span className="text-[12px] text-gray-400">{activePage} / {totalPages}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, activePage - 1))}
            disabled={activePage <= 1}
            className="flex-1 py-1.5 text-[12px] rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
          >← Prev</button>
          <button
            onClick={() => setPage(Math.min(totalPages, activePage + 1))}
            disabled={activePage >= totalPages}
            className="flex-1 py-1.5 text-[12px] rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
          >Next →</button>
        </div>
        {/* Page thumbnails */}
        {totalPages > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 text-[11px] rounded transition-colors font-mono ${
                  activePage === i + 1
                    ? "bg-blue-500 text-white"
                    : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Markup summary */}
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Markups</p>
          <span className="text-[12px] text-gray-400">{markups.filter(m => m.page === activePage).length}</span>
        </div>
        {["open", "pending", "resolved"].map((status) => {
          const count = markups.filter(m => m.page === activePage && m.status === status).length;
          return count > 0 ? (
            <div key={status} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === "open" ? "bg-red-400" : status === "pending" ? "bg-yellow-400" : "bg-green-400"
                }`} />
                <span className="text-[12px] text-gray-400 capitalize">{status}</span>
              </div>
              <span className="text-[12px] text-gray-500">{count}</span>
            </div>
          ) : null;
        })}

        {/* Equipment counts */}
        {counts.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Takeoff</p>
            {counts.map((c) => (
              <div key={c.equipmentId} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center" style={{ background: c.color + "33", color: c.color }}>
                    {c.abbreviation.slice(0, 2)}
                  </div>
                  <span className="text-[12px] text-gray-400">{c.name}</span>
                </div>
                <span className="text-[12px] font-bold text-white">{c.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
