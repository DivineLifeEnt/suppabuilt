import { NextResponse } from "next/server";
import { getMeasurementRepository } from "@/server/measurement/repositories";
import { createMeasurement } from "@/server/measurement/measurement-service";
import { CreateMeasurementSchema, MeasurementListQuerySchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// GET /api/plans/[planId]/measurements
export async function GET(request: Request, { params }: Params) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);

  const queryResult = MeasurementListQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    groupId: searchParams.get("group") ?? undefined,
  });

  if (!queryResult.success) {
    return apiError("INVALID_QUERY", "Invalid query parameters", 422, queryResult.error.flatten());
  }

  try {
    const repo = getMeasurementRepository();
    const measurements = await repo.list(
      planId,
      queryResult.data.page,
      queryResult.data.type,
      queryResult.data.groupId
    );
    return NextResponse.json({ measurements });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list measurements", 500);
  }
}

// POST /api/plans/[planId]/measurements
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = CreateMeasurementSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid measurement data", 422, parsed.error.flatten());
  }

  try {
    const measurement = await createMeasurement({
      ...parsed.data,
      createdBy: { name: "System" },
    });
    return NextResponse.json({ measurement }, { status: 201 });
  } catch (err) {
    const e = err as Error;
    return apiError("VALIDATION", e.message, 422);
  }
}
