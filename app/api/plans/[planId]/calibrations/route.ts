import { NextResponse } from "next/server";
import { getCalibrationRepository } from "@/server/measurement/repositories";
import { createCalibration } from "@/server/measurement/calibration-service";
import { CreateCalibrationSchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// GET /api/plans/[planId]/calibrations
export async function GET(_request: Request, { params }: Params) {
  const { planId } = await params;
  try {
    const repo = getCalibrationRepository();
    const calibrations = await repo.list(planId);
    return NextResponse.json({ calibrations });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list calibrations", 500);
  }
}

// POST /api/plans/[planId]/calibrations
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = CreateCalibrationSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid calibration data", 422, parsed.error.flatten());
  }

  try {
    const calibration = await createCalibration({
      ...parsed.data,
      createdBy: { name: "System" },
    });
    return NextResponse.json({ calibration }, { status: 201 });
  } catch (err) {
    const e = err as Error;
    return apiError("VALIDATION", e.message, 422);
  }
}
