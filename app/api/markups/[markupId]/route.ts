import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMarkupRepository,
  ConflictError,
  NotFoundError,
} from "@/server/markup/repositories";
import { updateMarkupSchema } from "@/lib/markup/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ markupId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}

// ── PATCH /api/markups/[markupId] ─────────────────────────────────────────────
export async function PATCH(request: Request, { params }: Params) {
  const { markupId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = updateMarkupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid update data", 422, parsed.error.flatten());
  }

  const { expectedRevision, ...input } = parsed.data;

  try {
    const repo = getMarkupRepository();
    const markup = await repo.update(markupId, input, expectedRevision);
    return NextResponse.json({ markup });
  } catch (err) {
    if (err instanceof ConflictError) {
      return apiError("CONFLICT", err.message, 409);
    }
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", err.message, 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to update markup", 500);
  }
}

// ── DELETE /api/markups/[markupId] ────────────────────────────────────────────
export async function DELETE(request: Request, { params }: Params) {
  const { markupId } = await params;
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("expectedRevision");
  if (!raw) {
    return apiError("MISSING_PARAM", "expectedRevision query parameter is required", 400);
  }
  const expectedRevision = parseInt(raw, 10);
  if (isNaN(expectedRevision) || expectedRevision < 1) {
    return apiError("INVALID_PARAM", "expectedRevision must be a positive integer", 400);
  }

  try {
    const repo = getMarkupRepository();
    await repo.delete(markupId, expectedRevision);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return apiError("CONFLICT", err.message, 409);
    }
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", err.message, 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to delete markup", 500);
  }
}
