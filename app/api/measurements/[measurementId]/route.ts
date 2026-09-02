import { NextResponse } from "next/server";
import {
  getMeasurementRepository,
  ConflictError,
  NotFoundError,
} from "@/server/measurement/repositories";
import { updateMeasurement } from "@/server/measurement/measurement-service";
import { UpdateMeasurementSchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ measurementId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// PATCH /api/measurements/[measurementId]
export async function PATCH(request: Request, { params }: Params) {
  const { measurementId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = UpdateMeasurementSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid measurement update", 422, parsed.error.flatten());
  }

  const { expectedRevision, ...updateInput } = parsed.data;

  try {
    const measurement = await updateMeasurement(measurementId, updateInput, expectedRevision);
    return NextResponse.json({ measurement });
  } catch (err) {
    if (err instanceof ConflictError) {
      return apiError("CONFLICT", "Revision conflict", 409, { revision: err.revision });
    }
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", "Measurement not found", 404);
    }
    const e = err as Error;
    return apiError("VALIDATION", e.message, 422);
  }
}

// DELETE /api/measurements/[measurementId]
export async function DELETE(request: Request, { params }: Params) {
  const { measurementId } = await params;
  const { searchParams } = new URL(request.url);
  const expectedRevision = parseInt(searchParams.get("expectedRevision") ?? "0", 10);

  if (!expectedRevision) {
    return apiError("INVALID_INPUT", "expectedRevision query param required", 422);
  }

  try {
    const repo = getMeasurementRepository();
    await repo.delete(measurementId, expectedRevision);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof ConflictError) {
      return apiError("CONFLICT", "Revision conflict", 409, { revision: err.revision });
    }
    if (err instanceof NotFoundError) {
      return apiError("NOT_FOUND", "Measurement not found", 404);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to delete measurement", 500);
  }
}
