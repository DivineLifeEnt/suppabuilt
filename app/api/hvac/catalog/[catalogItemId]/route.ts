import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateCatalogItemSchema } from "@/lib/takeoff/schemas";
import { ConflictError, NotFoundError } from "@/server/takeoff/repositories/takeoff-repository";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ catalogItemId: string }> };

// GET /api/hvac/catalog/[catalogItemId]
export async function GET(_req: Request, { params }: Params) {
  const { catalogItemId } = await params;
  try {
    const { catalogService } = getTakeoffServices();
    const item = await catalogService.getCatalogItem(catalogItemId);
    if (!item) return apiError("NOT_FOUND", "Catalog item not found", 404);
    return NextResponse.json({ item });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to get catalog item", 500);
  }
}

// PATCH /api/hvac/catalog/[catalogItemId]
export async function PATCH(request: Request, { params }: Params) {
  const { catalogItemId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = UpdateCatalogItemSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid update", 422, parsed.error.flatten());

  const { expectedRevision, ...input } = parsed.data;

  try {
    const { catalogService } = getTakeoffServices();
    const item = await catalogService.updateCatalogItem(catalogItemId, input, expectedRevision);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof NotFoundError) return apiError("NOT_FOUND", err.message, 404);
    if (err instanceof ConflictError) return apiError("CONFLICT", err.message, 409);
    console.error(err);
    return apiError("INTERNAL", "Failed to update catalog item", 500);
  }
}

// DELETE /api/hvac/catalog/[catalogItemId]
export async function DELETE(request: Request, { params }: Params) {
  const { catalogItemId } = await params;
  const { searchParams } = new URL(request.url);
  const expectedRevision = parseInt(searchParams.get("expectedRevision") ?? "0", 10);
  if (!expectedRevision) return apiError("VALIDATION", "expectedRevision query param required", 422);

  try {
    const { catalogService } = getTakeoffServices();
    await catalogService.deleteCatalogItem(catalogItemId, expectedRevision);
    return NextResponse.json({ deleted: catalogItemId });
  } catch (err) {
    if (err instanceof NotFoundError) return apiError("NOT_FOUND", err.message, 404);
    if (err instanceof ConflictError) return apiError("CONFLICT", err.message, 409);
    const e = err as Error;
    if (e.message?.includes("locked") || e.message?.includes("active takeoff")) {
      return apiError("CONFLICT", e.message, 409);
    }
    console.error(err);
    return apiError("INTERNAL", "Failed to delete catalog item", 500);
  }
}
