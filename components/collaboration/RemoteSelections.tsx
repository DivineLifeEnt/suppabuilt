"use client";

import { useCollaborationStore } from "@/stores/collaborationStore";

interface Props {
  pageWidth: number;
  pageHeight: number;
  currentUserId?: string;
}

export function RemoteSelections({ pageWidth, pageHeight, currentUserId }: Props) {
  const { presence } = useCollaborationStore();

  const selections = [...presence.values()].filter(
    (u) => u.selectedIds.length > 0 && u.userId !== currentUserId
  );

  if (selections.length === 0) return null;

  // Render placeholder dashed outlines (actual positions would come from markup store)
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={pageWidth}
      height={pageHeight}
      aria-hidden="true"
    >
      {selections.map((u) =>
        u.selectedIds.map((id) => (
          <rect
            key={`${u.userId}-${id}`}
            x="0" y="0" width="0" height="0"
            fill="none"
            stroke={u.color}
            strokeWidth="2"
            strokeDasharray="4 2"
            data-selection-id={id}
          />
        ))
      )}
    </svg>
  );
}
