import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that are public (unauthenticated reads allowed)
const PUBLIC_API_PATTERNS = [
  /^\/api\/auth\/.*/,          // NextAuth routes
  /^\/api\/plans\/[^/]+$/,     // GET single plan (PDF serving)
];

export default auth(function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/ routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public patterns
  for (const pattern of PUBLIC_API_PATTERNS) {
    if (pattern.test(pathname)) {
      return NextResponse.next();
    }
  }

  // Check authentication
  const session = (request as unknown as { auth: { user?: { id?: string } } | null }).auth;
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/:path*"],
};
