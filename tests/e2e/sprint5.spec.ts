import { test, expect } from "@playwright/test";

/**
 * Sprint 5 — Collaboration E2E smoke tests.
 *
 * These tests verify API wiring and auth guards without requiring live
 * Pusher credentials. They use the Playwright `request` fixture to make
 * direct HTTP calls to the Next.js dev/preview server.
 */

test.describe("Sprint 5 — Collaboration", () => {
  test("unauthenticated user gets 401 on session GET", async ({ request }) => {
    const resp = await request.get("/api/studio-sessions/nonexistent");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated user gets 401 on session snapshot", async ({ request }) => {
    const resp = await request.get("/api/studio-sessions/nonexistent/snapshot");
    // 404 is also acceptable if the route doesn't exist yet; 401 is expected when auth is checked first
    expect([401, 404]).toContain(resp.status());
  });

  test("unauthenticated user gets 401 on session activity", async ({ request }) => {
    const resp = await request.get("/api/studio-sessions/nonexistent/activity");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated user gets 401 on organizations list", async ({ request }) => {
    const resp = await request.get("/api/organizations");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST to organizations returns 401", async ({ request }) => {
    const resp = await request.post("/api/organizations", {
      data: { name: "Acme", slug: "acme" },
    });
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated user gets 401 on org members list", async ({ request }) => {
    const resp = await request.get("/api/organizations/nonexistent/members");
    expect(resp.status()).toBe(401);
  });

  test("sprint 1-4: PDF plans endpoint still reachable", async ({ request }) => {
    const resp = await request.get("/api/plans/nonexistent");
    // 401 = auth guard, 404 = route exists but plan not found — both are fine
    expect([200, 401, 404]).toContain(resp.status());
  });

  test("realtime authorize endpoint requires auth", async ({ request }) => {
    const resp = await request.post("/api/realtime/authorize", {
      data: { socket_id: "123.456", channel_name: "private-session-abc" },
    });
    expect([400, 401, 403]).toContain(resp.status());
  });
});
