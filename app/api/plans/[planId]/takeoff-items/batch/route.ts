import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { BatchTakeoffSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ planId: string }> };

// POST /api/plans/[planId]/takeoff-items/batch
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = BatchTakeoffSchema.safeParse(body);
  if (!parsed.success) {
    const flatten = parsed.error.flatten();
    if (flatten.fieldErrors["items"]?.some((e: string) => e.includes("max"))) {
      return apiError("BATCH_TOO_LARGE", "Batch max 250 items", 400);
    }
    return apiError("VALIDATION", "Invalid batch", 422, flatten);
  }

  try {
    const { takeoffService } = getTakeoffServices();
    const result = await takeoffService.batchTakeoffItems(planId, parsed.data as import("@/lib/takeoff/types").TakeoffBatchInput);
    return NextResponse.json({ results: result.results });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Batch failed", 500);
  }
}
