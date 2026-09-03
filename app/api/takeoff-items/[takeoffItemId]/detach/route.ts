import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

type Params = { params: Promise<{ takeoffItemId: string }> };

// POST /api/takeoff-items/[takeoffItemId]/detach
export async function POST(request: Request, { params }: Params) {
  const { takeoffItemId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { body = {}; }
  const reason = typeof (body as Record<string, unknown>)["reason"] === "string"
    ? (body as Record<string, string>)["reason"]
    : "";

  try {
    const { takeoffService } = getTakeoffServices();
    const item = await takeoffService.detachItem(takeoffItemId, reason);
    return NextResponse.json({ item });
  } catch (err) {
    const e = err as Error;
    if (e.message?.includes("not found")) return apiError("NOT_FOUND", e.message, 404);
    console.error(err);
    return apiError("INTERNAL", "Failed to detach item", 500);
  }
}
