import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdatePhaseSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ phaseId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { phaseId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const parsed = UpdatePhaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { repos } = getTakeoffServices();
  const phase = await repos.phases.update(phaseId, parsed.data);
  return NextResponse.json({ phase });
}
export async function DELETE(_req: Request, { params }: Params) {
  const { phaseId } = await params;
  const { repos } = getTakeoffServices();
  await repos.phases.delete(phaseId);
  return NextResponse.json({ deleted: phaseId });
}
