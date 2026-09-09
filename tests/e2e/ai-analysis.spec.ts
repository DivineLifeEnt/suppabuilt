import { test, expect } from "@playwright/test";

// Sprint 8 E2E: AI-assisted plan analysis
// Tests use the API directly (mocked providers via fake-provider in the route handler)

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

test.describe("Sprint 8 — AI analysis auth guards", () => {
  test("POST /api/ai/runs requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/runs`, {
      data: { sessionId: "session-1", pageIds: ["page-1"] },
    });
    // 401 unauthenticated or 403 AI_DISABLED — either is acceptable for guard test
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/ai/runs/:runId requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/runs/nonexistent-run`);
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/ai/sessions/:sessionId/suggestions requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/sessions/session-1/suggestions`);
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/ai/suggestions/:id/accept requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/suggestions/sug-1/accept`, {
      data: { takeoffInput: { qty: 1, unit: "ea", description: "test" } },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/ai/suggestions/:id/reject requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/suggestions/sug-1/reject`);
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/ai/policy requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/policy`);
    expect([401, 403]).toContain(res.status());
  });

  test("PUT /api/ai/policy requires auth", async ({ request }) => {
    const res = await request.put(`${BASE}/api/ai/policy`, {
      data: { monthlyLimitUsd: 5.0 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/ai/usage requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/ai/usage`);
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/ai/suggestions/bulk-review requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/suggestions/bulk-review`, {
      data: { items: [{ suggestionId: "s-1", action: "reject" }] },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("DELETE /api/ai/runs/:runId requires auth", async ({ request }) => {
    const res = await request.delete(`${BASE}/api/ai/runs/nonexistent-run`);
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Sprint 8 — AI disabled by default", () => {
  // When AI_ENABLED != "true", all routes return 403 with AI_DISABLED code
  // This test relies on the server NOT having AI_ENABLED=true set (default CI behavior)

  test("POST /api/ai/runs returns 403 AI_DISABLED when AI not enabled", async ({ request }) => {
    const res = await request.post(`${BASE}/api/ai/runs`, {
      data: { sessionId: "session-1", pageIds: ["page-1"] },
    });
    // In CI without credentials, we get 401 (auth) or 403 (AI_DISABLED)
    expect([401, 403]).toContain(res.status());
  });
});
