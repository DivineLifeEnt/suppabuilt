import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateTakeoffItemSchema } from "@/lib/takeoff/schemas";
import { ConflictError, NotFoundError } from "@/server/takeoff/repositories/takeoff-repository";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ takeoffItemId: string }> };

// PATCH /api/takeoff-items/[takeoffItemId]
export async function PATCH(request: Request, { params }: Params) {
  const { takeoffItemId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = UpdateTakeoffItemSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid update", 422, parsed.error.flatten());

  const { expectedRevision, ...input } = parsed.data;

  try {
    const { takeoffService } = getTakeoffServices();
    const item = await takeoffService.updateTakeoffItem(takeoffItemId, input, expectedRevision);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof NotFoundError) return apiError("NOT_FOUND", err.message, 404);
    if (err instanceof ConflictError) return apiError("CONFLICT", err.message, 409);
    const e = err as Error;
    if (e.message?.includes("locked")) return apiError("LOCKED", e.message, 409);
    console.error(err);
    return apiError("INTERNAL", "Failed to update takeoff item", 500);
  }
}

// DELETE /api/takeoff-items/[takeoffItemId]
export async function DELETE(request: Request, { params }: Params) {
  const { takeoffItemId } = await params;
  const { searchParams } = new URL(request.url);
  const expectedRevision = parseInt(searchParams.get("expectedRevision") ?? "0", 10);
  if (!expectedRevision) return apiError("VALIDATION", "expectedRevision query param required", 422);

  try {
    const { takeoffService } = getTakeoffServices();
    await takeoffService.deleteTakeoffItem(takeoffItemId, expectedRevision);
    return NextResponse.json({ deleted: takeoffItemId });
  } catch (err) {
    if (err instanceof NotFoundError) return apiError("NOT_FOUND", err.message, 404);
    if (err instanceof ConflictError) return apiError("CONFLICT", err.message, 409);
    const e = err as Error;
    if (e.message?.includes("locked")) return apiError("LOCKED", e.message, 409);
    console.error(err);
    return apiError("INTERNAL", "Failed to delete takeoff item", 500);
  }
}
