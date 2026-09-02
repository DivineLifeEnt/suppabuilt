import type { Markup, MarkupStatus, MarkupStyle, NormalizedBounds, NormalizedPoint } from "./types";

// ─── Commands ─────────────────────────────────────────────────────────────────

export type AddMarkupCommand = {
  type: "AddMarkup";
  markup: Markup;
};

export type DeleteMarkupCommand = {
  type: "DeleteMarkup";
  markup: Markup; // stores the whole thing so we can undo
};

export type MoveMarkupCommand = {
  type: "MoveMarkup";
  id: string;
  before: { start?: NormalizedPoint; end?: NormalizedPoint; point?: NormalizedPoint; bounds?: NormalizedBounds; points?: NormalizedPoint[] };
  after: { start?: NormalizedPoint; end?: NormalizedPoint; point?: NormalizedPoint; bounds?: NormalizedBounds; points?: NormalizedPoint[] };
};

export type ResizeMarkupCommand = {
  type: "ResizeMarkup";
  id: string;
  before: NormalizedBounds;
  after: NormalizedBounds;
};

export type UpdateStyleCommand = {
  type: "UpdateStyle";
  id: string;
  before: MarkupStyle;
  after: MarkupStyle;
};

export type UpdateStatusCommand = {
  type: "UpdateStatus";
  id: string;
  before: MarkupStatus;
  after: MarkupStatus;
};

export type SetLockCommand = {
  type: "SetLock";
  id: string;
  before: boolean;
  after: boolean;
};

export type SetVisibleCommand = {
  type: "SetVisible";
  id: string;
  before: boolean;
  after: boolean;
};

export type HistoryCommand =
  | AddMarkupCommand
  | DeleteMarkupCommand
  | MoveMarkupCommand
  | ResizeMarkupCommand
  | UpdateStyleCommand
  | UpdateStatusCommand
  | SetLockCommand
  | SetVisibleCommand;

// ─── Stack ────────────────────────────────────────────────────────────────────
export type HistoryStack = {
  past: HistoryCommand[];
  future: HistoryCommand[];
};

export const MAX_HISTORY = 100;

export function createHistoryStack(): HistoryStack {
  return { past: [], future: [] };
}

export function pushCommand(
  stack: HistoryStack,
  command: HistoryCommand
): HistoryStack {
  const past = [...stack.past, command].slice(-MAX_HISTORY);
  return { past, future: [] };
}

/**
 * Coalesce a MoveMarkup command with the most recent one for the same id.
 * Used to collapse continuous pointer drags into a single undo step.
 */
export function pushOrCoalesceMove(
  stack: HistoryStack,
  command: MoveMarkupCommand
): HistoryStack {
  const last = stack.past[stack.past.length - 1];
  if (last?.type === "MoveMarkup" && last.id === command.id) {
    // Keep the original "before" but update "after"
    const coalesced: MoveMarkupCommand = { ...last, after: command.after };
    const past = [...stack.past.slice(0, -1), coalesced];
    return { past, future: [] };
  }
  return pushCommand(stack, command);
}

/** Apply a command forward (redo / initial) to the markups record. */
export function applyCommand(
  markups: Record<string, Markup>,
  command: HistoryCommand
): Record<string, Markup> {
  switch (command.type) {
    case "AddMarkup":
      return { ...markups, [command.markup.id]: command.markup };

    case "DeleteMarkup": {
      const next = { ...markups };
      delete next[command.markup.id];
      return next;
    }

    case "MoveMarkup": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: applyGeometry(m, command.after) };
    }

    case "ResizeMarkup": {
      const m = markups[command.id];
      if (!m || m.kind !== "bounds") return markups;
      return { ...markups, [command.id]: { ...m, bounds: command.after } };
    }

    case "UpdateStyle": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, style: command.after } };
    }

    case "UpdateStatus": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, status: command.after } };
    }

    case "SetLock": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, locked: command.after } };
    }

    case "SetVisible": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, visible: command.after } };
    }
  }
}

/** Apply a command in reverse (undo). */
export function undoCommand(
  markups: Record<string, Markup>,
  command: HistoryCommand
): Record<string, Markup> {
  switch (command.type) {
    case "AddMarkup": {
      const next = { ...markups };
      delete next[command.markup.id];
      return next;
    }

    case "DeleteMarkup":
      return { ...markups, [command.markup.id]: command.markup };

    case "MoveMarkup": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: applyGeometry(m, command.before) };
    }

    case "ResizeMarkup": {
      const m = markups[command.id];
      if (!m || m.kind !== "bounds") return markups;
      return { ...markups, [command.id]: { ...m, bounds: command.before } };
    }

    case "UpdateStyle": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, style: command.before } };
    }

    case "UpdateStatus": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, status: command.before } };
    }

    case "SetLock": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, locked: command.before } };
    }

    case "SetVisible": {
      const m = markups[command.id];
      if (!m) return markups;
      return { ...markups, [command.id]: { ...m, visible: command.before } };
    }
  }
}

// ─── Undo / Redo helpers ──────────────────────────────────────────────────────

export function undo(
  stack: HistoryStack,
  markups: Record<string, Markup>
): { stack: HistoryStack; markups: Record<string, Markup> } | null {
  const command = stack.past[stack.past.length - 1];
  if (!command) return null;
  return {
    stack: {
      past: stack.past.slice(0, -1),
      future: [command, ...stack.future],
    },
    markups: undoCommand(markups, command),
  };
}

export function redo(
  stack: HistoryStack,
  markups: Record<string, Markup>
): { stack: HistoryStack; markups: Record<string, Markup> } | null {
  const command = stack.future[0];
  if (!command) return null;
  return {
    stack: {
      past: [...stack.past, command].slice(-MAX_HISTORY),
      future: stack.future.slice(1),
    },
    markups: applyCommand(markups, command),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type GeometryPatch = {
  start?: NormalizedPoint;
  end?: NormalizedPoint;
  point?: NormalizedPoint;
  bounds?: NormalizedBounds;
  points?: NormalizedPoint[];
};

function applyGeometry(m: Markup, patch: GeometryPatch): Markup {
  switch (m.kind) {
    case "bounds":
      return patch.bounds ? { ...m, bounds: patch.bounds } : m;
    case "line":
      return {
        ...m,
        ...(patch.start ? { start: patch.start } : {}),
        ...(patch.end ? { end: patch.end } : {}),
      };
    case "point":
      return patch.point ? { ...m, point: patch.point } : m;
    case "text":
      return patch.point ? { ...m, point: patch.point } : m;
    case "path":
      return patch.points ? { ...m, points: patch.points } : m;
    default:
      return m;
  }
}
