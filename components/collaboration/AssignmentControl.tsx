"use client";

import { useRef, useState, useEffect } from "react";

export interface AssignmentControlProps {
  commentId: string;
  assigneeId: string | null;
  members: Array<{ id: string; name: string }>;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

export function AssignmentControl({
  commentId: _commentId,
  assigneeId,
  members,
  onAssign,
  disabled = false,
}: AssignmentControlProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const assignee = members.find((m) => m.id === assigneeId) ?? null;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(id: string | null) {
    onAssign(id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded border border-[#2a3540] bg-[#111820] px-2 text-[11px] text-[#bdc6ce] transition hover:border-[#3a4d5c] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a]/20 text-[8px] font-bold text-[#ff7a32]">
          {assignee ? assignee.name.charAt(0).toUpperCase() : "—"}
        </span>
        <span className="max-w-[100px] truncate">
          {assignee ? assignee.name : "Unassigned"}
        </span>
        <span className="text-[#556370]">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Assign to"
          className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border border-[#2a3540] bg-[#111820] shadow-xl"
        >
          <button
            role="option"
            aria-selected={assigneeId === null}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#8895a2] transition hover:bg-[#1d2d3a]"
            onMouseDown={(e) => { e.preventDefault(); handleSelect(null); }}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#3a4d5c] text-[#556370] text-[9px]">—</span>
            Unassigned
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              role="option"
              aria-selected={m.id === assigneeId}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-[#1d2d3a] ${
                m.id === assigneeId ? "text-[#ff7a32]" : "text-[#e2e8ee]"
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(m.id); }}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a]/20 text-[8px] font-bold text-[#ff7a32]">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{m.name}</span>
              {m.id === assigneeId && <span className="ml-auto text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
