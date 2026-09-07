import { auth } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";

/**
 * Validate Auth.js JWT from request, return user or throw 401.
 * Never trust client-supplied userId/orgId — always resolve from JWT.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  // auth() reads from cookies/headers
  const session = await auth();
  if (!session?.user?.id) {
    throw Object.assign(new Error("Unauthenticated"), { statusCode: 401 });
  }
  void request; // session is from server-side auth, not request body
  return {
    userId: session.user.id,
    orgId: (session as Record<string, unknown>).orgId as string ?? "default-org",
    name: session.user.name ?? session.user.email ?? "Unknown",
    email: session.user.email ?? "",
  };
}

export function authError(): Response {
  return Response.json(
    { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
    { status: 401 }
  );
}

export function forbiddenError(message = "Forbidden"): Response {
  return Response.json(
    { error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}
