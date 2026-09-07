export type ConflictKind =
  | "geometry"
  | "metadata"
  | "deleted-remote"
  | "session-ended";

export type ConflictResolution =
  | { action: "keep-mine" }
  | { action: "accept-theirs" }
  | { action: "discard-local" };

export type Conflict = {
  aggregateType: string;
  aggregateId: string;
  kind: ConflictKind;
  localState: unknown;
  serverState: unknown;
  serverRevision: number;
};

/** Geometry conflicts require explicit user choice — no auto-merge allowed */
export function isAutoResolvable(conflict: Conflict): boolean {
  return conflict.kind !== "geometry";
}

/** Field-level diff between two objects (for metadata conflicts) */
export function diffMetadata(
  local: Record<string, unknown>,
  server: Record<string, unknown>
): Array<{ field: string; local: unknown; server: unknown }> {
  const allKeys = new Set([...Object.keys(local), ...Object.keys(server)]);
  const diffs: Array<{ field: string; local: unknown; server: unknown }> = [];
  for (const key of allKeys) {
    if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
      diffs.push({ field: key, local: local[key], server: server[key] });
    }
  }
  return diffs;
}
