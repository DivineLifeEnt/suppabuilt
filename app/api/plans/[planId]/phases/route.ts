import { NextResponse } from "next/server";
import { getTakeoffServices } from "@/server/takeoff/shared";
import { CreatePhaseSchema } from "@/lib/takeoff/schemas";

export const runtime = "nodejs";
type Params = { params: Promise<{ planId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { planId } = await params;
  const { repos } = getTakeoffServices();
  return NextResponse.json({ phases: await repos.phases.list(planId) });
}
export async function POST(request: Request, { params }: Params) {
  const { planId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const parsed = CreatePhaseSchema.safeParse({ ...(body as object), planId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { repos } = getTakeoffServices();
  const phase = await repos.phases.create(parsed.data);
  return NextResponse.json({ phase }, { status: 201 });
}
