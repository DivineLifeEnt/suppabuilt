import { NextResponse } from "next/server";
import { getMeasurementRepository } from "@/server/measurement/repositories";
import { BatchMeasurementSchema } from "@/lib/measurement/schemas";

export const runtime = "nodejs";

type Params = { params: Promise<{ planId: string }> };

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// POST /api/plans/[planId]/measurements/batch
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const parsed = BatchMeasurementSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("INVALID_INPUT", "Invalid batch input", 422, parsed.error.flatten());
  }

  if (parsed.data.items.length > 250) {
    return apiError("TOO_LARGE", "Batch size cannot exceed 250 items", 422);
  }

  try {
    const repo = getMeasurementRepository();
    const result = await repo.batch(planId, {
      items: parsed.data.items.map((item) => {
        if (item.op === "create") {
          return {
            ...item,
            input: { ...item.input, planId, createdBy: { name: "System" } },
          };
        }
        return item;
      }),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Batch operation failed", 500);
  }
}
