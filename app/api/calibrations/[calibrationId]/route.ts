import { NextResponse } from "next/server";
import {
  getCalibrationRepository,
  getMeasurementRepository,
  ConflictError,
  NotFoundError,
} from "@/server/measurement/repositories";
import { UpdateCalibrationSchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ calibrationId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// PATCH /api/calibrations/[calibrationId]
export async function PATCH(request: Request, { params }: Params) {
  const { calibrationId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = UpdateCalibrationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid calibration update", 422, parsed.error.flatten());
  }

  const { expectedRevision, ...updateInput } = parsed.data;

  try {
    const repo = getCalibrationRepository();
    const calibration = await repo.update(calibrationId, updateInput, expectedRevision);
    return NextResponse.json({ calibration });
  } catch (err) {
    if (err instanceof ConflictError) {
      return apiError("CONFLICT", "Revision conflict", 409, { revision: err.revision });
    }
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", "Calibration not found", 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to update calibration", 500);
  }
}

// DELETE /api/calibrations/[calibrationId]
export async function DELETE(request: Request, { params }: Params) {
  const { calibrationId } = await params;
  const { searchParams } = new URL(request.url);
  const expectedRevision = parseInt(searchParams.get("expectedRevision") ?? "0", 10);
  const force = searchParams.get("force") === "true";

  if (!expectedRevision) {
    return apiError("INVALID_INPUT", "expectedRevision query param required", 422);
  }

  try {
    // Check if any measurements reference this calibration
    if (!force) {
      const calRepo = getCalibrationRepository();
      const cal = await calRepo.get(calibrationId);
      if (!cal) return apiError("NOT_FOUND", "Calibration not found", 404);

      const mRepo = getMeasurementRepository();
      const measurements = await mRepo.list(cal.planId);
      const referenced = measurements.filter((m) => m.calibrationId === calibrationId);
      if (referenced.length > 0) {
        return apiError(
          "DEPENDENCY",
          `${referenced.length} measurement(s) reference this calibration. Use force=true to delete anyway.`,
          409
        );
      }
    }

    const repo = getCalibrationRepository();
    await repo.delete(calibrationId, expectedRevision);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return apiError("CONFLICT", "Revision conflict", 409, { revision: err.revision });
    }
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", "Calibration not found", 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to delete calibration", 500);
  }
}
