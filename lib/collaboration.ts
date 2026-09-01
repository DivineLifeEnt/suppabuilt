"use client";

import type * as Y from "yjs";
import type { WebsocketProvider } from "y-websocket";

export interface CollabSession {
  doc: Y.Doc;
  provider: WebsocketProvider;
  markups: Y.Array<unknown>;
  awareness: WebsocketProvider["awareness"];
  destroy: () => void;
}

export async function createStudioSession(
  projectId: string,
  drawingId: string,
  userName: string,
  userColor: string
): Promise<CollabSession> {
  const { Doc, Array: YArray } = await import("yjs");
  const { WebsocketProvider } = await import("y-websocket");

  const doc = new Doc();
  const room = `suppabuilt-${projectId}-${drawingId}`;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";

  const provider = new WebsocketProvider(wsUrl, room, doc);

  provider.awareness.setLocalState({
    name: userName,
    color: userColor,
    cursor: null,
  });

  const markups = doc.getArray<unknown>("markups");

  return {
    doc,
    provider,
    markups,
    awareness: provider.awareness,
    destroy: () => {
      provider.destroy();
      doc.destroy();
    },
  };
}

export function getPresenceColor(index: number): string {
  const colors = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
    "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
  ];
  return colors[index % colors.length];
}
