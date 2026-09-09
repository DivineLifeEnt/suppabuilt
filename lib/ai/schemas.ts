import { z } from "zod";

export const CreateAIRunSchema = z.object({
  sessionId: z.string(),
  pageIds: z.array(z.string()).min(1).max(20),
});

export const ReviewSuggestionSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(["accept", "reject"]),
  takeoffInput: z
    .object({
      qty: z.number().positive(),
      unit: z.string(),
      description: z.string(),
    })
    .optional(),
}).refine(
  (data) => data.action !== "accept" || data.takeoffInput !== undefined,
  { message: "takeoffInput is required when action is accept", path: ["takeoffInput"] }
);

export const AIBudgetPolicySchema = z.object({
  monthlyLimitUsd: z.number().min(0).max(10000),
});

export const BulkReviewSchema = z.object({
  items: z.array(
    z.object({
      suggestionId: z.string(),
      action: z.enum(["accept", "reject"]),
      takeoffInput: z
        .object({
          qty: z.number().positive(),
          unit: z.string(),
          description: z.string(),
        })
        .optional(),
    })
  ).min(1),
});
