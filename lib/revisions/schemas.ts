import { z } from "zod";

export const CreateDrawingSetSchema = z.object({
  name: z.string().min(1).max(100),
  discipline: z.string().max(50).optional(),
});

export const CreateVersionSchema = z.object({
  revisionName: z.string().min(1).max(100),
  revisionNumber: z.string().max(20).optional(),
  issueDate: z.string().datetime().optional(),
  receivedDate: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
});

export const UpdatePageVersionSchema = z.object({
  sheetNumber: z.string().max(20).optional(),
  sheetTitle: z.string().max(200).optional(),
  discipline: z.string().max(50).optional(),
  revisionLabel: z.string().max(50).optional(),
  revisionDate: z.string().datetime().optional(),
  expectedRevision: z.number().int().min(0),
});

export const PageMatchUpdateSchema = z.object({
  status: z
    .enum(["matched", "added", "removed", "ambiguous", "unmatched", "manually-matched"])
    .optional(),
  basePageId: z.string().optional().nullable(),
  comparisonPageId: z.string().optional().nullable(),
  userConfirmed: z.boolean().optional(),
  expectedRevision: z.number().int(),
});

export const AlignmentPointSchema = z.object({ x: z.number(), y: z.number() });

export const AlignmentPointsSchema = z.object({
  basePoints: z.array(AlignmentPointSchema).min(2).max(3),
  comparisonPoints: z.array(AlignmentPointSchema).min(2).max(3),
});

export const CarryForwardDecisionItemSchema = z.object({
  sourceAggregateType: z.enum(["markup", "measurement", "takeoff", "comment"]),
  sourceAggregateId: z.string(),
  decision: z.enum(["carry", "transform", "keep-old", "obsolete", "draft", "defer"]),
  reason: z.string().max(500).optional().nullable(),
});

export const CarryForwardDecisionSchema = z.object({
  decisions: z.array(CarryForwardDecisionItemSchema),
  idempotencyKey: z.string().uuid(),
});

export const UpdateDrawingSetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  discipline: z.string().max(50).optional().nullable(),
});

export const RegionReviewSchema = z.object({
  reviewStatus: z.enum(["accepted", "dismissed"]),
});

export type CreateDrawingSetInput = z.infer<typeof CreateDrawingSetSchema>;
export type CreateVersionInput = z.infer<typeof CreateVersionSchema>;
export type UpdatePageVersionInput = z.infer<typeof UpdatePageVersionSchema>;
export type PageMatchUpdateInput = z.infer<typeof PageMatchUpdateSchema>;
export type AlignmentPointsInput = z.infer<typeof AlignmentPointsSchema>;
export type CarryForwardDecisionInput = z.infer<typeof CarryForwardDecisionItemSchema>;
export type CarryForwardBatchInput = z.infer<typeof CarryForwardDecisionSchema>;
