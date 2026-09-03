import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { UpdateLevelSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ levelId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { levelId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const parsed = UpdateLevelSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { repos } = getTakeoffServices();
  const level = await repos.levels.update(levelId, parsed.data);
  return NextResponse.json({ level });
}
export async function DELETE(_req: Request, { params }: Params) {
  const { levelId } = await params;
  const { repos } = getTakeoffServices();
  await repos.levels.delete(levelId);
  return NextResponse.json({ deleted: levelId });
}
