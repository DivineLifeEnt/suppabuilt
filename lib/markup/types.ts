// ─── Markup Tool ───────────────────────────────────────────────────────────────
export type MarkupTool =
  | "select"
  | "pan"
  | "text"
  | "pen"
  | "highlighter"
  | "line"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "cloud"
  | "checkmark"
  | "cross"
  | "pin"
  | "eraser";

// ─── Geometry primitives ───────────────────────────────────────────────────────
/** Normalised 0..1 coordinates in unrotated PDF space */
export type NormalizedPoint = { x: number; y: number };

export type NormalizedBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Raw screen pixel point */
export type ScreenPoint = { x: number; y: number };

// ─── Geometry variants ────────────────────────────────────────────────────────
export type BoundsGeometry = { kind: "bounds"; bounds: NormalizedBounds };
export type PathGeometry = { kind: "path"; points: NormalizedPoint[] };
export type LineGeometry = {
  kind: "line";
  start: NormalizedPoint;
  end: NormalizedPoint;
};
export type PointGeometry = { kind: "point"; point: NormalizedPoint };
export type TextGeometry = {
  kind: "text";
  point: NormalizedPoint;
  text: string;
};

// ─── Style ────────────────────────────────────────────────────────────────────
export type MarkupStyle = {
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
};

// ─── Status ───────────────────────────────────────────────────────────────────
export type MarkupStatus = "open" | "pending" | "resolved" | "void";

// ─── Base ─────────────────────────────────────────────────────────────────────
export type MarkupBase = {
  id: string;
  planId: string;
  pageNumber: number;
  tool: MarkupTool;
  style: MarkupStyle;
  status: MarkupStatus;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  revision: number;
  authorName: string;
  label: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Discriminated union ──────────────────────────────────────────────────────
export type Markup =
  | (MarkupBase & { tool: "rectangle" | "ellipse" | "highlighter" } & BoundsGeometry)
  | (MarkupBase & { tool: "pen" | "cloud" } & PathGeometry)
  | (MarkupBase & { tool: "line" | "arrow" } & LineGeometry)
  | (MarkupBase & { tool: "pin" | "checkmark" | "cross" } & PointGeometry)
  | (MarkupBase & { tool: "text" } & TextGeometry);

// ─── Limits ───────────────────────────────────────────────────────────────────
export const MARKUP_LIMITS = {
  maxTextLength: 5000,
  maxPathPoints: 5000,
  maxBatch: 250,
  minOpacity: 0.05,
  maxOpacity: 1,
  minStrokeWidth: 0.5,
  maxStrokeWidth: 24,
  minFontSize: 8,
  maxFontSize: 144,
} as const;

// ─── Input types ─────────────────────────────────────────────────────────────
export type CreateMarkupInput = Omit<
  Markup,
  "id" | "revision" | "createdAt" | "updatedAt"
>;

export type UpdateMarkupInput = {
  style?: Partial<MarkupStyle>;
  status?: MarkupStatus;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;
  label?: string | null;
  comment?: string | null;
  authorName?: string;
  bounds?: NormalizedBounds;
  points?: NormalizedPoint[];
  start?: NormalizedPoint;
  end?: NormalizedPoint;
  point?: NormalizedPoint;
  text?: string;
};

// ─── Batch ───────────────────────────────────────────────────────────────────
export type BatchCreateItem = { op: "create"; input: CreateMarkupInput };
export type BatchUpdateItem = {
  op: "update";
  id: string;
  input: UpdateMarkupInput;
  expectedRevision: number;
};
export type BatchDeleteItem = {
  op: "delete";
  id: string;
  expectedRevision: number;
};
export type BatchItem = BatchCreateItem | BatchUpdateItem | BatchDeleteItem;

export type MarkupBatchInput = { items: BatchItem[] };

export type BatchResultItem =
  | { op: "create"; markup: Markup }
  | { op: "update"; markup: Markup }
  | { op: "delete"; id: string }
  | { op: "error"; index: number; code: string; message: string };

export type MarkupBatchResult = { results: BatchResultItem[] };

// ─── Type guards ──────────────────────────────────────────────────────────────
export function isBoundsMarkup(
  m: Markup
): m is MarkupBase & { tool: "rectangle" | "ellipse" | "highlighter" } & BoundsGeometry {
  return m.kind === "bounds";
}

export function isPathMarkup(
  m: Markup
): m is MarkupBase & { tool: "pen" | "cloud" } & PathGeometry {
  return m.kind === "path";
}

export function isLineMarkup(
  m: Markup
): m is MarkupBase & { tool: "line" | "arrow" } & LineGeometry {
  return m.kind === "line";
}

export function isPointMarkup(
  m: Markup
): m is MarkupBase & { tool: "pin" | "checkmark" | "cross" } & PointGeometry {
  return m.kind === "point";
}

export function isTextMarkup(
  m: Markup
): m is MarkupBase & { tool: "text" } & TextGeometry {
  return m.kind === "text";
}
