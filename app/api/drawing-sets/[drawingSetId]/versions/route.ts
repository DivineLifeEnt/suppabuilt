import { NextRequest } from "next/server";
import { requireAuth, authError } from "@/server/collaboration/auth";
import { DrawingVersionService } from "@/server/revisions/drawing-version-service";
import { CreateVersionSchema } from "@/lib/revisions/schemas";

const svc = new DrawingVersionService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ drawingSetId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { drawingSetId } = await params;
  const versions = await svc.listVersions(drawingSetId, user.userId);
  return Response.json({ versions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ drawingSetId: string }> }
): Promise<Response> {
  let user;
  try {
    user = await requireAuth(req);
  } catch {
    return authError();
  }
  const { drawingSetId } = await params;

  // Handle multipart form data
  let file: Buffer;
  let filename: string;
  let metadata: unknown;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const fileEntry = formData.get("file");
      const metaEntry = formData.get("metadata");

      if (!fileEntry || !(fileEntry instanceof File)) {
        return Response.json({ error: { code: "BAD_REQUEST", message: "Missing file field" } }, { status: 400 });
      }

      const arrayBuffer = await fileEntry.arrayBuffer();
      file = Buffer.from(arrayBuffer);
      filename = fileEntry.name;
      metadata = metaEntry ? JSON.parse(String(metaEntry)) : {};
    } catch {
      return Response.json({ error: { code: "BAD_REQUEST", message: "Failed to parse form data" } }, { status: 400 });
    }
  } else {
    // JSON body with base64 file
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
    }
    const b = body as Record<string, unknown>;
    if (!b.file || typeof b.file !== "string") {
      return Response.json({ error: { code: "BAD_REQUEST", message: "Missing file (base64)" } }, { status: 400 });
    }
    file = Buffer.from(b.file as string, "base64");
    filename = (b.filename as string | undefined) ?? "upload.pdf";
    metadata = b.metadata ?? {};
  }

  const parsed = CreateVersionSchema.safeParse(metadata);
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION", issues: parsed.error.issues } }, { status: 400 });
  }

  try {
    const version = await svc.uploadVersion(drawingSetId, file, filename, parsed.data, {
      userId: user.userId,
      orgId: user.orgId,
      name: user.name,
    });
    return Response.json({ version }, { status: 201 });
  } catch (err) {
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 409) {
      return Response.json({ error: { code: e.code ?? "CONFLICT", message: e.message } }, { status: 409 });
    }
    if (e.statusCode === 400) {
      return Response.json({ error: { code: e.code ?? "BAD_REQUEST", message: e.message } }, { status: 400 });
    }
    throw err;
  }
}
