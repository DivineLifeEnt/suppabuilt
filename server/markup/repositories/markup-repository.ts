import type {
  Markup,
  CreateMarkupInput,
  UpdateMarkupInput,
  MarkupBatchInput,
  MarkupBatchResult,
} from "@/lib/markup/types";

export interface MarkupRepository {
  list(planId: string, pageNumber?: number): Promise<Markup[]>;
  get(id: string): Promise<Markup | null>;
  create(input: CreateMarkupInput): Promise<Markup>;
  update(
    id: string,
    input: UpdateMarkupInput,
    expectedRevision: number
  ): Promise<Markup>;
  delete(id: string, expectedRevision: number): Promise<void>;
  batch(planId: string, input: MarkupBatchInput): Promise<MarkupBatchResult>;
}

export class ConflictError extends Error {
  readonly code = "CONFLICT";
  constructor(id: string, expected: number, actual: number) {
    super(
      `Markup ${id}: revision conflict — expected ${expected}, got ${actual}`
    );
  }
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND";
  constructor(id: string) {
    super(`Markup ${id} not found`);
  }
}
