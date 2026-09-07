import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

// Enforce: DEV_AUTH_ENABLED can NEVER be true when NODE_ENV=production
if (
  process.env.DEV_AUTH_ENABLED === "true" &&
  process.env.NODE_ENV === "production"
) {
  throw new Error("DEV_AUTH_ENABLED must not be set to true in production.");
}

const devProvider =
  process.env.DEV_AUTH_ENABLED === "true" &&
  process.env.NODE_ENV !== "production"
    ? Credentials({
        credentials: { email: {}, password: {} },
        async authorize(credentials) {
          const parsed = z
            .object({ email: z.string().email(), password: z.string().min(1) })
            .safeParse(credentials);
          if (!parsed.success) return null;
          if (parsed.data.password !== "dev") return null;
          return {
            id: `dev-${parsed.data.email}`,
            email: parsed.data.email,
            name: parsed.data.email.split("@")[0],
          };
        },
      })
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: devProvider ? [devProvider] : [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.orgId = "default-org";
        token.name = user.name ?? user.email ?? "";
        token.email = user.email ?? "";
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId as string;
      (session as Record<string, unknown>).orgId = token.orgId;
      return session;
    },
  },
  session: { strategy: "jwt" },
});

export type AuthUser = {
  userId: string;
  orgId: string;
  name: string;
  email: string;
};

/** Get current user from server context, throws if unauthenticated */
export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw Object.assign(new Error("Unauthenticated"), { statusCode: 401 });
  }
  return {
    userId: session.user.id,
    orgId: (session as Record<string, unknown>).orgId as string ?? "default-org",
    name: session.user.name ?? session.user.email ?? "Unknown",
    email: session.user.email ?? "",
  };
}
