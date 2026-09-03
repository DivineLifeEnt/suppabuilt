import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateAssemblySchema } from "@/lib/takeoff/schemas";
import { ConflictError, NotFoundError } from "@/server/takeoff/repositories/takeoff-repository";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ assemblyId: string }> };

// GET /api/hvac/assemblies/[assemblyId]
export async function GET(_req: Request, { params }: Params) {
  const { assemblyId } = await params;
  try {
    const { assemblyService } = getTakeoffServices();
    const assembly = await assemblyService.getAssembly(assemblyId);
    if (!assembly) return apiError("NOT_FOUND", "Assembly not found", 404);
    return NextResponse.json({ assembly });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to get assembly", 500);
  }
}

// PATCH /api/hvac/assemblies/[assemblyId]
export async function PATCH(request: Request, { params }: Params) {
  const { assemblyId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }
  const parsed = UpdateAssemblySchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid update", 422, parsed.error.flatten());
  const { expectedRevision, ...input } = parsed.data;
  try {
    const { assemblyService } = getTakeoffServices();
    const assembly = await assemblyService.updateAssembly(assemblyId, input as import("@/lib/takeoff/types").UpdateAssemblyInput, expectedRevision);
    return NextResponse.json({ assembly });
  } catch (err) {
    if (err instanceof NotFoundError) return apiError("NOT_FOUND", err.message, 404);
    if (err instanceof ConflictError) return apiError("CONFLICT", err.message, 409);
    console.error(err);
    return apiError("INTERNAL", "Failed to update assembly", 500);
  }
}

// DELETE /api/hvac/assemblies/[assemblyId]
export async function DELETE(request: Request, { params }: Params) {
  const { assemblyId } = await params;
  const { searchParams } = new URL(request.url);
  const expectedRevision = parseInt(searchParams.get("expectedRevision") ?? "0", 10);
  if (!expectedRevision) return apiError("VALIDATION", "expectedRevision query param required", 422);
  try {
    const { assemblyService } = getTakeoffServices();
    await assemblyService.deleteAssembly(assemblyId, expectedRevision);
    return NextResponse.json({ deleted: assemblyId });
  } catch (err) {
    if (err instanceof NotFoundError) return apiError("NOT_FOUND", err.message, 404);
    if (err instanceof ConflictError) return apiError("CONFLICT", err.message, 409);
    console.error(err);
    return apiError("INTERNAL", "Failed to delete assembly", 500);
  }
}
