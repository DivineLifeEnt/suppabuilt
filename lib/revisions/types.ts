import type { NormalizedPoint, NormalizedBounds } from "@/lib/markup/types";

export type { NormalizedPoint, NormalizedBounds };

export type VersionStatus = "processing" | "ready" | "failed" | "current" | "superseded" | "archived";

export type PageMatchStatus = "matched" | "added" | "removed" | "ambiguous" | "unmatched" | "manually-matched";

// Row-major 3×3 matrix as flat 9-element tuple
export type AffineMatrix = readonly [
  number, number, number,
  number, number, number,
  number, number, number
];

export type ComparisonMode = "side-by-side" | "slider" | "blink" | "overlay" | "difference";

export type JobState = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "retrying";

export type DrawingSet = {
  id: string;
  projectId: string;
  organizationId: string;
  name: string;
  discipline: string | null;
  currentVersionId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DrawingSetVersion = {
  id: string;
  drawingSetId: string;
  revisionName: string;
  revisionNumber: string | null;
  issueDate: string | null;
  receivedDate: string | null;
  description: string | null;
  sourceFilename: string;
  checksum: string;        // sha-256 hex
  uploadedBy: string;
  status: VersionStatus;
  pageCount: number | null;
  processingError: string | null;
  revision: number;        // optimistic concurrency
  createdAt: string;
  updatedAt: string;
};

export type DrawingPageVersion = {
  id: string;
  versionId: string;
  drawingSetId: string;
  pageIndex: number;         // 0-based PDF page
  sheetNumber: string | null;
  sheetTitle: string | null;
  discipline: string | null;
  revisionLabel: string | null;
  revisionDate: string | null;
  widthPt: number;
  heightPt: number;
  nativeRotation: 0 | 90 | 180 | 270;
  contentChecksum: string | null;
  thumbnailKey: string | null;
  renderKey: string | null;
  processingStatus: "pending" | "ready" | "failed";
  processingError: string | null;
  userConfirmedMetadata: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type PageMatch = {
  id: string;
  baseVersionId: string;
  comparisonVersionId: string;
  drawingSetId: string;
  basePageId: string | null;
  comparisonPageId: string | null;
  status: PageMatchStatus;
  confidence: number;          // 0..1
  matchReasons: string[];
  userConfirmed: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type PageAlignment = {
  id: string;
  pageMatchId: string;
  method: "identity" | "auto" | "two-point" | "three-point" | "manual";
  matrix: AffineMatrix;         // comparison-page → base-page coords (normalized 0..1)
  qualityScore: number | null;  // 0..1
  residualError: number | null; // mean pixel residual
  userConfirmed: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type DrawingComparison = {
  id: string;
  baseVersionId: string;
  comparisonVersionId: string;
  drawingSetId: string;
  pageMatchId: string;
  alignmentId: string | null;
  jobId: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  previewKey: string | null;
  maskKey: string | null;
  overlayKey: string | null;
  metrics: ComparisonMetrics | null;
  idempotencyKey: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type ComparisonMetrics = {
  changedPixelCount: number;
  totalPixelCount: number;
  changePercent: number;
  regionCount: number;
  processingMs: number;
  rasterDpi: number;
  algorithmVersion: string;
};

export type ChangeRegion = {
  id: string;
  comparisonId: string;
  bounds: NormalizedBounds;
  kind: "added" | "removed" | "changed";
  changedPixelCount: number;
  strength: number;           // 0..1
  reviewStatus: "unreviewed" | "accepted" | "dismissed";
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type ProcessingJob = {
  id: string;
  type: "version-ingest" | "page-render" | "page-match" | "auto-align" | "diff-process" | "artifact-cleanup";
  organizationId: string;
  projectId: string;
  drawingSetId: string | null;
  versionId: string | null;
  comparisonId: string | null;
  state: JobState;
  progress: number;           // 0..100
  stage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  maxAttempts: number;
  attemptCount: number;
  nextAttemptAt: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
};

export type CarryForwardDecision = {
  id: string;
  comparisonId: string;
  sourceAggregateType: "markup" | "measurement" | "takeoff" | "comment";
  sourceAggregateId: string;
  targetAggregateId: string | null;
  decision: "carry" | "transform" | "keep-old" | "obsolete" | "draft" | "defer";
  transform: AffineMatrix | null;
  reason: string | null;
  actorId: string;
  decidedAt: string;
  idempotencyKey: string;
};

export type AggregateLineage = {
  id: string;
  sourceAggregateType: string;
  sourceAggregateId: string;
  sourceVersionId: string;
  targetAggregateType: string;
  targetAggregateId: string;
  targetVersionId: string;
  carryForwardDecisionId: string;
  transformApplied: AffineMatrix | null;
  createdAt: string;
};
