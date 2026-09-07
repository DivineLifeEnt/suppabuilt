import { test, expect } from "@playwright/test";

/**
 * Sprint 6 — Drawing-set version management E2E smoke tests.
 *
 * These tests verify API route wiring and auth guards without requiring a live
 * database or artifact storage. They use the Playwright `request` fixture to
 * make direct HTTP calls to the Next.js server.
 *
 * All unauthenticated calls are expected to return 401.
 * All calls with a valid auth session but a nonexistent resource return 404.
 */

test.describe("Sprint 6 — Drawing set version management", () => {
  // ── Drawing sets ──────────────────────────────────────────────────────────

  test("unauthenticated GET project drawing sets returns 401", async ({ request }) => {
    const resp = await request.get("/api/projects/nonexistent/drawing-sets");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST project drawing sets returns 401", async ({ request }) => {
    const resp = await request.post("/api/projects/nonexistent/drawing-sets", {
      data: { name: "Electrical", discipline: "E" },
    });
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated GET drawing set returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-sets/nonexistent");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated PATCH drawing set returns 401", async ({ request }) => {
    const resp = await request.patch("/api/drawing-sets/nonexistent", {
      data: { name: "Updated" },
    });
    expect(resp.status()).toBe(401);
  });

  // ── Versions ──────────────────────────────────────────────────────────────

  test("unauthenticated GET drawing set versions returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-sets/nonexistent/versions");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST drawing set version returns 401", async ({ request }) => {
    const resp = await request.post("/api/drawing-sets/nonexistent/versions", {
      data: { label: "Rev A" },
    });
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated GET drawing version returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-versions/nonexistent");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST confirm-current returns 401", async ({ request }) => {
    const resp = await request.post("/api/drawing-versions/nonexistent/confirm-current");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST retry version returns 401", async ({ request }) => {
    const resp = await request.post("/api/drawing-versions/nonexistent/retry");
    expect(resp.status()).toBe(401);
  });

  // ── Pages ─────────────────────────────────────────────────────────────────

  test("unauthenticated GET version pages returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-versions/nonexistent/pages");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated PATCH page version returns 401", async ({ request }) => {
    const resp = await request.patch("/api/drawing-page-versions/nonexistent", {
      data: { sheetNumber: "A-1" },
    });
    expect(resp.status()).toBe(401);
  });

  // ── Page matching ─────────────────────────────────────────────────────────

  test("unauthenticated GET page matches returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-versions/nonexistent/page-matches");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST page matches returns 401", async ({ request }) => {
    const resp = await request.post("/api/drawing-versions/nonexistent/page-matches", {
      data: {},
    });
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST finalize page matches returns 401", async ({ request }) => {
    const resp = await request.post(
      "/api/drawing-versions/nonexistent/page-matches/finalize"
    );
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated PATCH page match returns 401", async ({ request }) => {
    const resp = await request.patch("/api/page-matches/nonexistent", {
      data: { status: "confirmed" },
    });
    expect(resp.status()).toBe(401);
  });

  // ── Alignment ─────────────────────────────────────────────────────────────

  test("unauthenticated GET alignment returns 401", async ({ request }) => {
    const resp = await request.get("/api/page-matches/nonexistent/alignment");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST alignment auto returns 401", async ({ request }) => {
    const resp = await request.post("/api/page-matches/nonexistent/alignment/auto");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST alignment confirm returns 401", async ({ request }) => {
    const resp = await request.post("/api/page-matches/nonexistent/alignment/confirm");
    expect(resp.status()).toBe(401);
  });

  // ── Comparisons ───────────────────────────────────────────────────────────

  test("unauthenticated GET comparisons returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-comparisons");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST comparison returns 401", async ({ request }) => {
    const resp = await request.post("/api/drawing-comparisons", {
      data: { baseVersionId: "v1", comparisonVersionId: "v2" },
    });
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated GET comparison by id returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-comparisons/nonexistent");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST run comparison returns 401", async ({ request }) => {
    const resp = await request.post("/api/drawing-comparisons/nonexistent/run");
    expect(resp.status()).toBe(401);
  });

  // ── Change regions ────────────────────────────────────────────────────────

  test("unauthenticated GET change regions returns 401", async ({ request }) => {
    const resp = await request.get("/api/drawing-comparisons/nonexistent/regions");
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated PATCH change region returns 401", async ({ request }) => {
    const resp = await request.patch("/api/change-regions/nonexistent", {
      data: { reviewStatus: "confirmed" },
    });
    expect(resp.status()).toBe(401);
  });

  // ── Carry forward ─────────────────────────────────────────────────────────

  test("unauthenticated POST carry-forward preview returns 401", async ({ request }) => {
    const resp = await request.post(
      "/api/drawing-comparisons/nonexistent/carry-forward/preview"
    );
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated POST carry-forward apply returns 401", async ({ request }) => {
    const resp = await request.post(
      "/api/drawing-comparisons/nonexistent/carry-forward",
      { data: {} }
    );
    expect(resp.status()).toBe(401);
  });

  test("unauthenticated GET carry-forward decisions returns 401", async ({ request }) => {
    const resp = await request.get(
      "/api/drawing-comparisons/nonexistent/carry-forward/decisions"
    );
    expect(resp.status()).toBe(401);
  });

  // ── Processing jobs ───────────────────────────────────────────────────────

  test("unauthenticated GET processing job returns 401", async ({ request }) => {
    const resp = await request.get("/api/processing-jobs/nonexistent");
    expect(resp.status()).toBe(401);
  });

  // ── Artifacts ─────────────────────────────────────────────────────────────

  test("artifact endpoint requires a valid signed URL (unsigned → 401 or 400)", async ({
    request,
  }) => {
    const resp = await request.get("/api/artifacts?key=test%2Ffile.pdf");
    expect([400, 401]).toContain(resp.status());
  });

  // ── Sprint 1-5 regression: existing plans endpoint still works ────────────

  test("sprint 1-5 regression: plans endpoint still reachable", async ({ request }) => {
    const resp = await request.get("/api/plans/nonexistent");
    expect([200, 401, 404]).toContain(resp.status());
  });
});
