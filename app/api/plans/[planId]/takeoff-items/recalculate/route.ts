import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Params = { params: Promise<{ planId: string }> };

// POST /api/plans/[planId]/takeoff-items/recalculate
export async function POST(request: Request, { params }: Params) {
  void params; // planId available if needed
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const b = body as Record<string, unknown>;
  const measurementId = typeof b["measurementId"] === "string" ? b["measurementId"] : null;
  const newValueMm = typeof b["newValueMm"] === "number" ? b["newValueMm"] : null;
  const newValueMm2 = typeof b["newValueMm2"] === "number" ? b["newValueMm2"] : undefined;

  if (!measurementId || newValueMm === null) {
    return apiError("VALIDATION", "measurementId and newValueMm required", 422);
  }

  try {
    const { takeoffService } = getTakeoffServices();
    const updated = await takeoffService.recalculateLinkedItems(measurementId, newValueMm, newValueMm2);
    return NextResponse.json({ updated: updated.length, items: updated });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Recalculate failed", 500);
  }
}
