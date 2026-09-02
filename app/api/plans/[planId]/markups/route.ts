import { NextResponse } from "next/server";
import { z } from "zod";
import { getMarkupRepository, ConflictError, NotFoundError } from "@/server/markup/repositories";
import { createMarkupSchema, listQuerySchema } from "@/lib/markup/schemas";
import { MARKUP_LIMITS } from "@/lib/markup/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// ── GET /api/plans/[planId]/markups ──────────────────────────────────────────
export async function GET(request: Request, { params }: Params) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);
  const queryResult = listQuerySchema.safeParse({ page: searchParams.get("page") ?? undefined });
  if (!queryResult.success) {
    return apiError("INVALID_QUERY", "Invalid query parameters", 422, queryResult.error.flatten());
  }

  try {
    const repo = getMarkupRepository();
    const markups = await repo.list(planId, queryResult.data.page);
    return NextResponse.json({ markups });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list markups", 500);
  }
}

// ── POST /api/plans/[planId]/markups ─────────────────────────────────────────
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = createMarkupSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid markup data", 422, parsed.error.flatten());
  }

  try {
    const repo = getMarkupRepository();
    const markup = await repo.create({
      ...parsed.data,
      authorName: "System",
    } as Parameters<typeof repo.create>[0]);
    return NextResponse.json({ markup }, { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to create markup", 500);
  }
}

// ── POST /api/plans/[planId]/markups/batch ────────────────────────────────────
// (handled by the batch route file in the same directory)
