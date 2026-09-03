import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateZoneSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
function apiError(code: string, message: string, status: number, d?: unknown) {
  return NextResponse.json({ error: { code, message, ...(d ? { details: d } : {}) } }, { status });
}
type Params = { params: Promise<{ zoneId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { zoneId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Bad JSON", 400); }
  const parsed = UpdateZoneSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid update", 422, parsed.error.flatten());
  const { repos } = getTakeoffServices();
  const zone = await repos.zones.update(zoneId, parsed.data);
  return NextResponse.json({ zone });
}
export async function DELETE(_req: Request, { params }: Params) {
  const { zoneId } = await params;
  const { repos } = getTakeoffServices();
  await repos.zones.delete(zoneId);
  return NextResponse.json({ deleted: zoneId });
}
