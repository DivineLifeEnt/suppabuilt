"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";

interface Props {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  currentUserId?: string;
}

export function RemoteCursors({ pageNumber, pageWidth, pageHeight, currentUserId }: Props) {
  const { presence } = useCollaborationStore();

  const cursors = [...presence.values()].filter(
    (u) => u.cursor && u.pageNumber === pageNumber && u.userId !== currentUserId
  );

  if (cursors.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={pageWidth}
      height={pageHeight}
      aria-hidden="true"
    >
      {cursors.map((u) => {
        if (!u.cursor) return null;
        const x = u.cursor.x * pageWidth;
        const y = u.cursor.y * pageHeight;
        return (
          <g key={u.userId} transform={`translate(${x},${y})`}>
            <path
              d="M0,0 L0,14 L4,11 L7,16 L9,15 L6,10 L10,10 Z"
              fill={u.color}
              stroke="white"
              strokeWidth="1"
            />
            <rect x="11" y="12" width={u.name.length * 6 + 8} height="14" rx="3" fill={u.color} />
            <text x="15" y="22.5" fontSize="9" fill="white" fontWeight="600">{u.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
