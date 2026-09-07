import { NextRequest } from "next/server";
import { getArtifactStorage, verifyArtifactSignature } from "@/server/revisions/artifact-service";
import { validateArtifactKey } from "@/lib/revisions/artifact-keys";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function extContentType(key: string): string {
  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_MAP[ext] ?? "application/octet-stream";
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const sig = url.searchParams.get("sig");
  const expStr = url.searchParams.get("exp");

  if (!key || !sig || !expStr) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Missing key, sig, or exp" } }, { status: 400 });
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp)) {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Invalid exp" } }, { status: 400 });
  }

  // Verify HMAC signature
  if (!verifyArtifactSignature(key, sig, exp)) {
    return Response.json({ error: { code: "FORBIDDEN", message: "Invalid or expired signature" } }, { status: 403 });
  }

  try {
    validateArtifactKey(key);
  } catch {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Invalid key" } }, { status: 400 });
  }

  const storage = getArtifactStorage();
  try {
    const data = await storage.get(key);
    const contentType = extContentType(key);
    return new Response(data as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
}
