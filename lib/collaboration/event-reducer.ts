import type { RealtimeEvent } from "@/server/collaboration/realtime-provider";
import type { Markup } from "@/lib/markup/types";
import type { Measurement } from "@/lib/measurement/types";
import type { TakeoffItem } from "@/lib/takeoff/types";

export type EventClassification =
  | "applied"
  | "duplicate"
  | "stale"
  | "gap"
  | "cross-tenant";

export interface MarkupStoreActions {
  upsertMarkup: (markup: Markup) => void;
  removeMarkup: (id: string) => void;
}

export interface MeasurementStoreActions {
  upsertMeasurement: (m: Measurement) => void;
  removeMeasurement: (id: string) => void;
}

export interface TakeoffStoreActions {
  upsertTakeoffItem: (item: TakeoffItem) => void;
  removeTakeoffItem: (id: string) => void;
}

/**
 * Classify an incoming event against known revisions.
 * knownRevisions: aggregateId -> current known revision
 */
export function classifyEvent(
  event: RealtimeEvent,
  knownRevisions: Map<string, number>,
  currentOrgId: string,
  currentSessionId: string
): EventClassification {
  if (event.organizationId !== currentOrgId) return "cross-tenant";
  if (event.sessionId !== currentSessionId) return "cross-tenant";

  const known = knownRevisions.get(event.aggregateId);

  if (known === undefined) {
    // New aggregate — always apply
    return "applied";
  }

  if (event.aggregateRevision <= known) return "stale";
  if (event.aggregateRevision === known + 1) return "applied";
  // Gap detected
  return "gap";
}

export function applyMarkupEvent(event: RealtimeEvent, store: MarkupStoreActions): void {
  if (event.type === "markup.deleted") {
    store.removeMarkup(event.aggregateId);
  } else {
    store.upsertMarkup(event.payload as Markup);
  }
}

export function applyMeasurementEvent(event: RealtimeEvent, store: MeasurementStoreActions): void {
  if (event.type === "measurement.deleted") {
    store.removeMeasurement(event.aggregateId);
  } else {
    store.upsertMeasurement(event.payload as Measurement);
  }
}

export function applyTakeoffEvent(event: RealtimeEvent, store: TakeoffStoreActions): void {
  if (event.type === "takeoff.deleted") {
    store.removeTakeoffItem(event.aggregateId);
  } else {
    store.upsertTakeoffItem(event.payload as TakeoffItem);
  }
}
