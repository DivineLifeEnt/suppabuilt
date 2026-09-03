import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreateTakeoffItemSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ planId: string }> };

// GET /api/plans/[planId]/takeoff-items
export async function GET(request: Request, { params }: Params) {
  const { planId } = await params;
  const { searchParams } = new URL(request.url);

  const filter = {
    systemId: searchParams.get("systemId") ?? undefined,
    zoneId: searchParams.get("zoneId") ?? undefined,
    levelId: searchParams.get("levelId") ?? undefined,
    phaseId: searchParams.get("phaseId") ?? undefined,
    groupId: searchParams.get("groupId") ?? undefined,
    status: (searchParams.get("status") ?? undefined) as "open" | "resolved" | undefined,
    pageNumber: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined,
  };

  try {
    const { takeoffService } = getTakeoffServices();
    const items = await takeoffService.listTakeoffItems(planId, filter);
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return apiError("INTERNAL", "Failed to list takeoff items", 500);
  }
}

// POST /api/plans/[planId]/takeoff-items
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }

  const parsed = CreateTakeoffItemSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) return apiError("VALIDATION", "Invalid takeoff item", 422, parsed.error.flatten());

  try {
    const { takeoffService } = getTakeoffServices();
    const item = await takeoffService.createTakeoffItem(parsed.data as unknown as import("@/lib/takeoff/types").CreateTakeoffInput);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const e = err as Error;
    if (e.message?.includes("not found")) return apiError("NOT_FOUND", e.message, 404);
    console.error(err);
    return apiError("INTERNAL", "Failed to create takeoff item", 500);
  }
}
