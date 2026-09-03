import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateSystemSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ systemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { systemId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }
  const parsed = UpdateSystemSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid update", 422, parsed.error.flatten());
  try {
    const { repos } = getTakeoffServices();
    const system = await repos.systems.update(systemId, parsed.data);
    return NextResponse.json({ system });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to update system", 500);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { systemId } = await params;
  try {
    const { repos } = getTakeoffServices();
    await repos.systems.delete(systemId);
    return NextResponse.json({ deleted: systemId });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to delete system", 500);
  }
}
