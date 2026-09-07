import type { NormalizedPoint } from "@/lib/markup/types";

export type PresencePayload = {
  pageNumber: number;
  cursor: NormalizedPoint | null;
  activeTool: string | null;
  selectedIds: string[];
  isTyping: boolean;
};

const USER_COLORS = [
  "#E53E3E", "#DD6B20", "#D69E2E", "#38A169",
  "#319795", "#3182CE", "#805AD5", "#D53F8C",
  "#667EEA", "#48BB78", "#F6AD55", "#FC8181",
];

/** Generate stable user color from userId */
export function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

/** Throttle cursor updates: max 20 Hz (50ms minimum between updates) */
export function createPresenceThrottle(
  fn: (update: PresencePayload) => void,
  limitMs = 50
): (update: PresencePayload) => void {
  let lastCall = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let lastArg: PresencePayload | null = null;

  return (update: PresencePayload) => {
    const now = Date.now();
    lastArg = update;
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(update);
    } else if (!pending) {
      pending = setTimeout(() => {
        pending = null;
        lastCall = Date.now();
        if (lastArg) fn(lastArg);
      }, limitMs - (now - lastCall));
    }
  };
}
