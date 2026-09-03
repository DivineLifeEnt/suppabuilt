import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreateZoneSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}
type Params = { params: Promise<{ planId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { planId } = await params;
  const { repos } = getTakeoffServices();
  return NextResponse.json({ zones: await repos.zones.list(planId) });
}
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Bad JSON", 400); }
  const parsed = CreateZoneSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) return apiError("VALIDATION", "Invalid zone", 422, parsed.error.flatten());
  const { repos } = getTakeoffServices();
  const zone = await repos.zones.create(parsed.data);
  return NextResponse.json({ zone }, { status: 201 });
}
