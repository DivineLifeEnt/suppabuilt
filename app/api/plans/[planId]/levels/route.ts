import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreateLevelSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
function apiError(code: string, message: string, status: number, d?: unknown) {
  return NextResponse.json({ error: { code, message, ...(d ? { details: d } : {}) } }, { status });
}
type Params = { params: Promise<{ planId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { planId } = await params;
  const { repos } = getTakeoffServices();
  return NextResponse.json({ levels: await repos.levels.list(planId) });
}
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Bad JSON", 400); }
  const parsed = CreateLevelSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) return apiError("VALIDATION", "Invalid level", 422, parsed.error.flatten());
  const { repos } = getTakeoffServices();
  const level = await repos.levels.create({ ...parsed.data, elevation: parsed.data.elevation ?? null });
  return NextResponse.json({ level }, { status: 201 });
}
