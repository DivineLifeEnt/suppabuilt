import { NextResponse } from "next/server";
import { getMarkupRepository } from "@/server/markup/repositories";
import { batchSchema } from "@/lib/markup/schemas";
import { MARKUP_LIMITS } from "@/lib/markup/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid batch data", 422, parsed.error.flatten());
  }

  if (parsed.data.items.length > MARKUP_LIMITS.maxBatch) {
    return apiError(
      "BATCH_TOO_LARGE",
      `Batch may contain at most ${MARKUP_LIMITS.maxBatch} items`,
      422
    );
  }

  try {
    const repo = getMarkupRepository();
    const result = await repo.batch(planId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Batch operation failed", 500);
  }
}
