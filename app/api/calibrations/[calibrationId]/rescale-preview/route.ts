import { NextResponse } from "next/server";
import { rescalePreview } from "@/server/measurement/calibration-service";
import { UpdateCalibrationSchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ calibrationId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// POST /api/calibrations/[calibrationId]/rescale-preview
export async function POST(request: Request, { params }: Params) {
  const { calibrationId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = UpdateCalibrationSchema.omit({ expectedRevision: true }).safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid rescale input", 422, parsed.error.flatten());
  }

  try {
    const preview = await rescalePreview(calibrationId, parsed.data);
    return NextResponse.json(preview);
  } catch (err) {
    const e = err as Error;
    return apiError("INTERNAL", e.message, 500);
  }
}
