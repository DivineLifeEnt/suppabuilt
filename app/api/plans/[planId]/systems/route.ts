import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreateSystemSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ planId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { planId } = await params;
  try {
    const { repos } = getTakeoffServices();
    const systems = await repos.systems.list(planId);
    return NextResponse.json({ systems });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list systems", 500);
  }
}

export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }
  const parsed = CreateSystemSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) return apiError("VALIDATION", "Invalid system", 422, parsed.error.flatten());
  try {
    const { repos } = getTakeoffServices();
    const system = await repos.systems.create(parsed.data);
    return NextResponse.json({ system }, { status: 201 });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to create system", 500);
  }
}
