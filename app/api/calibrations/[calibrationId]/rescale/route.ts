import { NextResponse } from "next/server";
import { rescale } from "@/server/measurement/calibration-service";
import { UpdateCalibrationSchema } from "@/lib/measurement/schemas";
import { z } from "zod";

export const runtime = "nodejs";

type Params = { params: Promise<{ calibrationId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

const RescaleBodySchema = z.object({
  expectedRevision: z.number().int().min(1),
  update: UpdateCalibrationSchema.omit({ expectedRevision: true }),
  reassignMeasurementIds: z.array(z.string()).optional(),
});

// POST /api/calibrations/[calibrationId]/rescale
export async function POST(request: Request, { params }: Params) {
  const { calibrationId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = RescaleBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid rescale input", 422, parsed.error.flatten());
  }

  try {
    const result = await rescale(
      calibrationId,
      parsed.data.update,
      { reassignMeasurementIds: parsed.data.reassignMeasurementIds }
    );
    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error;
    return apiError("INTERNAL", e.message, 500);
  }
}
