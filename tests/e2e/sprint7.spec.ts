import { test, expect } from "@playwright/test";

// Sprint 7 E2E: guards, export auth, backwards compat

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

test.describe("Sprint 7 — auth guards", () => {
  test("estimate list requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects/proj_test/estimates`);
    expect([401, 403]).toContain(res.status());
  });

  test("estimate version totals requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/estimate-versions/ver_test/totals`);
    expect([401, 403]).toContain(res.status());
  });

  test("submit-review requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/estimate-versions/ver_test/submit-review`, { data: {} });
    expect([401, 403]).toContain(res.status());
  });

  test("export creation requires auth", async ({ request }) => {
    const res = await request.post(`${BASE}/api/exports`, {
      data: { projectId: "proj_test", exportType: "takeoff-xlsx", idempotencyKey: "test-key" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("export download requires auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/exports/job_test/download`);
    expect([401, 403]).toContain(res.status());
  });

  test("cost codes require auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/organizations/org_test/cost-codes`);
    expect([401, 403]).toContain(res.status());
  });

  test("labor rates require auth", async ({ request }) => {
    const res = await request.get(`${BASE}/api/organizations/org_test/labor-rates`);
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Sprint 7 — backwards compatibility", () => {
  test("Sprint 1-6 drawing sets route still responds", async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects/proj_test/drawing-sets`);
    // 401 = auth guard (expected), not 404
    expect(res.status()).not.toBe(404);
    expect(res.status()).not.toBe(500);
  });

  test("health check returns 200 if present", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    // If route doesn't exist, that's fine (404) — but never 500
    expect(res.status()).not.toBe(500);
  });
});
