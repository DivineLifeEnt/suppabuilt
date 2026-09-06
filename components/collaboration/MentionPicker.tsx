"use client";

import { useEffect, useRef } from "react";

export interface MentionPickerProps {
  query: string;
  members: Array<{ id: string; name: string }>;
  onSelect: (userId: string, name: string) => void;
  onClose: () => void;
}

export function MentionPicker({ query, members, onSelect, onClose }: MentionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Mention a member"
      className="absolute z-50 mt-1 w-56 overflow-hidden rounded-md border border-[#2a3540] bg-[#111820] shadow-xl"
    >
      {filtered.map((member) => (
        <button
          key={member.id}
          role="option"
          aria-selected={false}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#e2e8ee] transition hover:bg-[#1d2d3a] focus:bg-[#1d2d3a] focus:outline-none"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(member.id, member.name);
          }}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff6a1a]/20 text-[10px] font-bold text-[#ff7a32]">
            {member.name.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{member.name}</span>
        </button>
      ))}
    </div>
  );
}
