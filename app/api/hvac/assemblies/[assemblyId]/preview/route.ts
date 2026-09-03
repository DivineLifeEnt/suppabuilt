import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { AssemblyPreviewSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";

function apiError(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

type Params = { params: Promise<{ assemblyId: string }> };

// POST /api/hvac/assemblies/[assemblyId]/preview
export async function POST(request: Request, { params }: Params) {
  const { assemblyId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Invalid JSON body", 400); }
  const parsed = AssemblyPreviewSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION", "Invalid context", 422, parsed.error.flatten());
  try {
    const { assemblyService } = getTakeoffServices();
    const preview = await assemblyService.previewAssembly(assemblyId, parsed.data);
    return NextResponse.json({ preview });
  } catch (err) {
    const e = err as Error;
    if (e.message?.includes("not found")) return apiError("NOT_FOUND", e.message, 404);
    console.error(err);
    return apiError("INTERNAL", "Failed to preview assembly", 500);
  }
}
